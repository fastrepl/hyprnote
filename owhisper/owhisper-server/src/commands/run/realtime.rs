use std::sync::{Arc, Mutex};

use futures_util::StreamExt;
use hypr_audio::AsyncSource;
use tokio::sync::mpsc;

use super::{
    calculate_rms, create_event_channel, draw_ui, AmplitudeData, RunState, TerminalGuard, TuiEvent,
    TuiEventSender,
};

pub async fn handle_realtime_input(
    model: String,
    device: Option<String>,
    port: u16,
    api_key: Option<String>,
) -> anyhow::Result<()> {
    let available_devices = hypr_audio::AudioInput::list_mic_devices();
    let initial_device = device
        .or_else(|| available_devices.first().cloned())
        .ok_or_else(|| anyhow::anyhow!("No audio devices found"))?;

    let (event_tx, mut event_rx) = create_event_channel();

    let (transcript_tx, transcript_rx) =
        mpsc::unbounded_channel::<owhisper_interface::StreamResponse>();

    let amplitude_data = Arc::new(Mutex::new(AmplitudeData::new()));

    let mut current_audio_device = initial_device.clone();
    let mut audio_abort_handle = start_audio_task(
        current_audio_device.clone(),
        port,
        api_key.clone(),
        model.clone(),
        transcript_tx.clone(),
        amplitude_data.clone(),
    );

    let mut tui_handle = {
        let event_tx = event_tx.clone();
        let amplitude_data = amplitude_data.clone();
        let available_devices = available_devices.clone();

        tokio::spawn(async move {
            run_tui_with_events(
                initial_device,
                available_devices,
                amplitude_data,
                event_tx,
                transcript_rx,
            )
            .await
        })
    };

    loop {
        tokio::select! {
            Some(event) = event_rx.recv() => {
                match event {
                    TuiEvent::DeviceChanged(new_device) => {
                        audio_abort_handle.store(true, std::sync::atomic::Ordering::Relaxed);
                        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                        current_audio_device = new_device;

                        audio_abort_handle = start_audio_task(
                            current_audio_device.clone(),
                            port,
                            api_key.clone(),
                            model.clone(),
                            transcript_tx.clone(),
                            amplitude_data.clone(),
                        );
                    }
                    TuiEvent::Quit => {
                        break;
                    }
                }
            }
            result = &mut tui_handle => {
                audio_abort_handle.store(true, std::sync::atomic::Ordering::Relaxed);
                return result?;
            }
        }
    }

    audio_abort_handle.store(true, std::sync::atomic::Ordering::Relaxed);
    Ok(())
}

fn start_audio_task(
    device_name: String,
    port: u16,
    api_key: Option<String>,
    model: String,
    transcript_tx: mpsc::UnboundedSender<owhisper_interface::StreamResponse>,
    amplitude_data: Arc<Mutex<AmplitudeData>>,
) -> std::sync::Arc<std::sync::atomic::AtomicBool> {
    let should_stop = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let should_stop_clone = should_stop.clone();

    std::thread::spawn(move || {
        let runtime = tokio::runtime::Runtime::new().unwrap();
        runtime.block_on(async move {
            let _ = run_audio_stream_with_stop(
                device_name,
                port,
                api_key,
                model,
                transcript_tx,
                amplitude_data,
                should_stop_clone,
            )
            .await;
        });
    });

    should_stop
}

async fn run_audio_stream_with_stop(
    device_name: String,
    port: u16,
    api_key: Option<String>,
    model: String,
    transcript_tx: mpsc::UnboundedSender<owhisper_interface::StreamResponse>,
    amplitude_data: Arc<Mutex<AmplitudeData>>,
    should_stop: std::sync::Arc<std::sync::atomic::AtomicBool>,
) -> anyhow::Result<()> {
    let mic_stream = {
        let mut audio_input = hypr_audio::AudioInput::from_mic(Some(device_name.clone()))?;
        let amplitude_clone = amplitude_data.clone();
        let mut agc = hypr_agc::Agc::default();

        audio_input
            .stream()
            .resample(16000)
            .chunks(512)
            .map(move |chunk| {
                let samples: Vec<f32> = {
                    let mut samples: Vec<f32> = chunk.to_vec();
                    agc.process(&mut samples);
                    samples
                };

                if let Ok(mut data) = amplitude_clone.lock() {
                    let rms = calculate_rms(&samples);
                    data.update(rms);
                }

                owhisper_interface::MixedMessage::Audio(
                    hypr_audio_utils::f32_to_i16_bytes(samples.into_iter()).into(),
                )
            })
    };

    let client = owhisper_client::ListenClient::builder()
        .api_base(&format!("ws://127.0.0.1:{}", port))
        .api_key(api_key.as_deref().unwrap_or(""))
        .params(owhisper_interface::ListenParams {
            model: Some(model),
            languages: vec![hypr_language::ISO639::En.into()],
            ..Default::default()
        })
        .build_single();

    let (response_stream, _) = client.from_realtime_audio(mic_stream).await?;
    futures_util::pin_mut!(response_stream);

    while let Some(Ok(chunk)) = response_stream.next().await {
        if should_stop.load(std::sync::atomic::Ordering::Relaxed) {
            break;
        }
        if transcript_tx.send(chunk).is_err() {
            break;
        }
    }

    Ok(())
}

async fn run_tui_with_events(
    current_device: String,
    available_devices: Vec<String>,
    amplitude_data: Arc<Mutex<AmplitudeData>>,
    event_tx: TuiEventSender,
    mut transcript_rx: mpsc::UnboundedReceiver<owhisper_interface::StreamResponse>,
) -> anyhow::Result<()> {
    use ratatui::crossterm::event::{self, Event, KeyCode};
    use std::time::{Duration, Instant};

    let mut term = TerminalGuard::new()?;
    let mut state = RunState::new(current_device, available_devices);
    state.set_event_sender(event_tx.clone());

    let tick_rate = Duration::from_millis(50);
    let mut last_tick = Instant::now();

    loop {
        let amp_data = amplitude_data.lock().unwrap().clone();
        term.draw(|f| draw_ui(f, &mut state, &amp_data))?;

        while let Ok(chunk) = transcript_rx.try_recv() {
            state.process_chunk(chunk);
        }

        if event::poll(Duration::from_millis(0))? {
            if let Event::Key(key) = event::read()? {
                match key.code {
                    KeyCode::Char('q') | KeyCode::Esc => {
                        if state.show_device_selector {
                            state.show_device_selector = false;
                        } else {
                            let _ = event_tx.send(TuiEvent::Quit);
                            break;
                        }
                    }
                    KeyCode::Char('d') => {
                        state.show_device_selector = !state.show_device_selector;
                    }
                    KeyCode::Down | KeyCode::Char('j') => {
                        if state.show_device_selector {
                            state.device_list_state.select_next();
                        } else {
                            state.scroll_down();
                        }
                    }
                    KeyCode::Up | KeyCode::Char('k') => {
                        if state.show_device_selector {
                            state.device_list_state.select_previous();
                        } else {
                            state.scroll_up();
                        }
                    }
                    KeyCode::Enter => {
                        if state.show_device_selector {
                            if let Some(selected) = state.device_list_state.selected() {
                                let new_device = state.available_devices[selected].clone();
                                if new_device != state.current_device {
                                    let _ =
                                        event_tx.send(TuiEvent::DeviceChanged(new_device.clone()));
                                    state.current_device = new_device;
                                }
                                state.show_device_selector = false;
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        if last_tick.elapsed() >= tick_rate {
            last_tick = Instant::now();
        }

        tokio::time::sleep(Duration::from_millis(10)).await;
    }

    Ok(())
}
