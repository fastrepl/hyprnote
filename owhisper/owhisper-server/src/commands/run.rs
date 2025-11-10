use futures_util::StreamExt;

use crate::{misc::shutdown_signal, Server};

#[derive(clap::Parser)]
pub struct RunArgs {
    pub model: String,
    #[arg(short, long)]
    pub config: Option<String>,
    #[arg(short, long)]
    pub device: Option<String>,
    #[arg(long)]
    pub dry_run: bool,
}

/// Runs the server and real-time audio transcription loop according to the provided command-line arguments.
///
/// This starts a local server, initializes the selected microphone input, creates a ListenClient that
/// forwards real-time audio to the server, and prints partial and final transcription results to stdout.
/// If `args.dry_run` is true, it instead prints available input devices and returns without starting the server.
/// The function exits the run loop when a shutdown signal is received and aborts the spawned server task before returning.
///
/// # Examples
///
/// ```
/// use tokio::runtime::Runtime;
/// // Construct minimal RunArgs with dry_run to avoid starting servers or audio I/O in the example.
/// let args = RunArgs { model: "QuantizedTiny".into(), config: None, device: None, dry_run: true };
/// let rt = Runtime::new().unwrap();
/// rt.block_on(async { handle_run(args).await.unwrap() });
/// ```
pub async fn handle_run(args: RunArgs) -> anyhow::Result<()> {
pub async fn handle_run(args: RunArgs) -> anyhow::Result<()> {
    if args.dry_run {
        print_input_devices();
        return Ok(());
    }

    let port = 1234;

    let config = owhisper_config::Config::new(args.config)?;
    let api_key = config.general.as_ref().and_then(|g| g.api_key.clone());
    let server = Server::new(config, Some(port));

    log::info!("server");
    let server_handle =
        tokio::spawn(async move { server.run_with_shutdown(shutdown_signal()).await });
    log::info!("server_handle");

    let input_devices: Vec<String> = hypr_audio::MicInput::list_devices();
        log::info!("input_devices: {:#?}", input_devices);

        let input_device = match hypr_audio::MicInput::new(args.device) {
            Ok(device) => device,
            Err(e) => {
                log::error!("Failed to initialize microphone: {:?}", e);
                std::process::exit(1);
            }
        };
        log::info!("input_device: {}", input_device.device_name());
        let audio_stream = input_device.stream();

    let api_base = format!("ws://127.0.0.1:{}", port);

    let client = owhisper_client::ListenClient::builder()
        .api_base(&api_base)
        .api_key(api_key.as_deref().unwrap_or(""))
        .params(owhisper_interface::ListenParams {
            model: Some("QuantizedTiny".to_string()),
            ..Default::default()
        })
        .build_single();

    log::info!("client");
    let response_stream = client.from_realtime_audio(audio_stream).await?;
    futures_util::pin_mut!(response_stream);
    log::info!("response_stream");

    loop {
        tokio::select! {
            _ = shutdown_signal() => {
                break;
            }
            chunk = response_stream.next() => {
                match chunk {
                    Some(chunk) => {
                        if !chunk.words.is_empty() {
                            let text = chunk
                                .words
                                .iter()
                                .map(|w| w.text.as_str())
                                .collect::<Vec<_>>()
                                .join(" ");

                            // Check if this is a final transcript based on metadata
                            if let Some(meta) = &chunk.meta {
                                if let Some(is_final) = meta.get("is_final").and_then(|v| v.as_bool()) {
                                    if is_final {
                                        println!("\n[FINAL] {}", text);
                                    } else {
                                        print!("\r[PARTIAL] {}", text);
                                        use std::io::Write;
                                        std::io::stdout().flush()?;
                                    }
                                } else {
                                    println!("{}", text);
                                }
                            } else {
                                println!("{}", text);
                            }
                        }
                    }
                    None => {
                        break;
                    }
                }
            }
        }
    }

    server_handle.abort();

    Ok(())
}

fn print_input_devices() {
    use tabled::settings::{style::HorizontalLine, style::VerticalLine, Style};

    let style = Style::modern()
        .horizontals([(1, HorizontalLine::inherit(Style::modern()).horizontal('═'))])
        .verticals([(1, VerticalLine::inherit(Style::modern()))])
        .remove_horizontal()
        .remove_vertical();

    let table = tabled::Table::new(hypr_audio::MicInput::list_devices())
        .with(style)
        .to_string();

    println!("{}", table);
}