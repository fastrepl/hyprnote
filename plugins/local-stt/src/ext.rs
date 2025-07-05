use std::{future::Future, path::PathBuf};

use tauri::{ipc::Channel, Manager, Runtime};
use tauri_plugin_store2::StorePluginExt;

use hypr_file::{download_file_with_callback, DownloadProgress};
use hypr_listener_interface::Word;

use crate::events::RecordedProcessingEvent;

pub trait LocalSttPluginExt<R: Runtime> {
    fn local_stt_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn models_dir(&self) -> PathBuf;
    fn list_ggml_backends(&self) -> Vec<hypr_whisper_local::GgmlBackend>;
    fn api_base(&self) -> impl Future<Output = Option<String>>;
    fn is_server_running(&self) -> impl Future<Output = bool>;
    fn start_server(&self) -> impl Future<Output = Result<String, crate::Error>>;
    fn stop_server(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn get_current_model(&self) -> Result<crate::SupportedModel, crate::Error>;
    fn set_current_model(&self, model: crate::SupportedModel) -> Result<(), crate::Error>;

    fn process_recorded(
        &self,
        model_path: impl AsRef<std::path::Path>,
        audio_path: impl AsRef<std::path::Path>,
        progress_fn: impl FnMut(RecordedProcessingEvent) + Send + 'static,
    ) -> Result<Vec<Word>, crate::Error>;

    fn download_model(
        &self,
        model: crate::SupportedModel,
        channel: Channel<i8>,
    ) -> impl Future<Output = Result<(), crate::Error>>;

    fn is_model_downloading(&self, model: &crate::SupportedModel) -> impl Future<Output = bool>;
    fn is_model_downloaded(
        &self,
        model: &crate::SupportedModel,
    ) -> impl Future<Output = Result<bool, crate::Error>>;
}

impl<R: Runtime, T: Manager<R>> LocalSttPluginExt<R> for T {
    fn local_stt_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn models_dir(&self) -> PathBuf {
        self.path().app_data_dir().unwrap().join("stt")
    }

    fn list_ggml_backends(&self) -> Vec<hypr_whisper_local::GgmlBackend> {
        hypr_whisper_local::list_ggml_backends()
    }

    #[tracing::instrument(skip_all)]
    async fn api_base(&self) -> Option<String> {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;

        s.api_base.clone()
    }

    #[tracing::instrument(skip_all)]
    async fn is_model_downloaded(
        &self,
        model: &crate::SupportedModel,
    ) -> Result<bool, crate::Error> {
        let model_path = self.models_dir().join(model.file_name());

        for (path, expected) in [(model_path, model.model_size())] {
            if !path.exists() {
                return Ok(false);
            }

            let actual = hypr_file::file_size(path)?;
            if actual != expected {
                return Ok(false);
            }
        }

        Ok(true)
    }

    #[tracing::instrument(skip_all)]
    async fn is_server_running(&self) -> bool {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;

        s.server.is_some()
    }

    #[tracing::instrument(skip_all)]
    async fn start_server(&self) -> Result<String, crate::Error> {
        let cache_dir = self.models_dir();
        let model = self.get_current_model()?;

        if !self.is_model_downloaded(&model).await? {
            return Err(crate::Error::ModelNotDownloaded);
        }

        let server_state = crate::ServerStateBuilder::default()
            .model_cache_dir(cache_dir)
            .model_type(model)
            .build();

        let server = crate::run_server(server_state).await?;
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        let api_base = format!("http://{}", &server.addr);

        {
            let state = self.state::<crate::SharedState>();
            let mut s = state.lock().await;
            s.api_base = Some(api_base.clone());
            s.server = Some(server);
        }

        Ok(api_base)
    }

    #[tracing::instrument(skip_all)]
    async fn stop_server(&self) -> Result<(), crate::Error> {
        let state = self.state::<crate::SharedState>();
        let mut s = state.lock().await;

        if let Some(server) = s.server.take() {
            let _ = server.shutdown.send(());
        }
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn download_model(
        &self,
        model: crate::SupportedModel,
        channel: Channel<i8>,
    ) -> Result<(), crate::Error> {
        let m = model.clone();
        let model_path = self.models_dir().join(m.file_name());

        let task = tokio::spawn(async move {
            let callback = |progress: DownloadProgress| match progress {
                DownloadProgress::Started => {
                    let _ = channel.send(0);
                }
                DownloadProgress::Progress(downloaded, total_size) => {
                    let percent = (downloaded as f64 / total_size as f64) * 100.0;
                    let _ = channel.send(percent as i8);
                }
                DownloadProgress::Finished => {
                    let _ = channel.send(100);
                }
            };

            if let Err(e) = download_file_with_callback(m.model_url(), model_path, callback).await {
                tracing::error!("model_download_error: {}", e);
                let _ = channel.send(-1);
            }
        });

        {
            let state = self.state::<crate::SharedState>();
            let mut s = state.lock().await;

            if let Some(existing_task) = s.download_task.remove(&model) {
                existing_task.abort();
            }
            s.download_task.insert(model.clone(), task);
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    fn process_recorded(
        &self,
        model_path: impl AsRef<std::path::Path>,
        audio_path: impl AsRef<std::path::Path>,
        mut progress_fn: impl FnMut(RecordedProcessingEvent) + Send + 'static,
    ) -> Result<Vec<Word>, crate::Error> {
        use rodio::Source;

        let decoder = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(audio_path.as_ref()).unwrap(),
        ))
        .unwrap();

        let original_sample_rate = decoder.sample_rate();
        let channels = decoder.channels() as usize;
        let samples_f32: Vec<f32> = decoder.convert_samples().collect();

        let resampled_samples = if original_sample_rate != 16000 {
            resample_audio(&samples_f32, original_sample_rate as f64, 16000.0, channels)?
        } else {
            samples_f32
        };

        let samples_i16 = hypr_audio_utils::f32_to_i16_samples(&resampled_samples);

        let mut model = hypr_whisper_local::Whisper::builder()
            .model_path(model_path.as_ref().to_str().unwrap())
            .static_prompt("")
            .dynamic_prompt("")
            .build();

        let mut segmenter = hypr_pyannote_local::segmentation::Segmenter::new(16000).unwrap();
        let segments = segmenter.process(&samples_i16, 16000).unwrap();
        let num_segments = segments.len();

        let mut words = Vec::new();

        for segment in segments {
            let audio_f32 = hypr_audio_utils::i16_to_f32_samples(&segment.samples);

            let whisper_segments = model.transcribe(&audio_f32).unwrap();

            for whisper_segment in whisper_segments {
                let start_sec: f64 = segment.start + (whisper_segment.start() as f64);
                let end_sec: f64 = segment.start + (whisper_segment.end() as f64);
                let start_ms = (start_sec * 1000.0) as u64;
                let end_ms = (end_sec * 1000.0) as u64;

                let word = Word {
                    text: whisper_segment.text().to_string(),
                    speaker: None,
                    confidence: Some(whisper_segment.confidence()),
                    start_ms: Some(start_ms),
                    end_ms: Some(end_ms),
                };
                words.push(word.clone());
                progress_fn(RecordedProcessingEvent::Progress {
                    current: words.len(),
                    total: num_segments,
                    word,
                });
            }
        }

        Ok(words)
    }

    #[tracing::instrument(skip_all)]
    async fn is_model_downloading(&self, model: &crate::SupportedModel) -> bool {
        let state = self.state::<crate::SharedState>();

        {
            let guard = state.lock().await;
            guard.download_task.contains_key(model)
        }
    }

    #[tracing::instrument(skip_all)]
    fn get_current_model(&self) -> Result<crate::SupportedModel, crate::Error> {
        let store = self.local_stt_store();
        let model = store.get(crate::StoreKey::DefaultModel)?;
        Ok(model.unwrap_or(crate::SupportedModel::QuantizedBaseEn))
    }

    #[tracing::instrument(skip_all)]
    fn set_current_model(&self, model: crate::SupportedModel) -> Result<(), crate::Error> {
        let store = self.local_stt_store();
        store.set(crate::StoreKey::DefaultModel, model)?;
        Ok(())
    }
}

fn resample_audio(
    samples: &[f32],
    from_rate: f64,
    to_rate: f64,
    channels: usize,
) -> Result<Vec<f32>, crate::Error> {
    if (from_rate - to_rate).abs() < 1.0 {
        return Ok(samples.to_vec());
    }

    use rubato::{
        Resampler, SincFixedIn, SincInterpolationParameters, SincInterpolationType, WindowFunction,
    };

    let params = SincInterpolationParameters {
        sinc_len: 256,
        f_cutoff: 0.95,
        interpolation: SincInterpolationType::Linear,
        oversampling_factor: 256,
        window: WindowFunction::BlackmanHarris2,
    };

    let mut resampler =
        SincFixedIn::<f32>::new(to_rate / from_rate, 2.0, params, 1024, channels).unwrap();

    let frames_per_channel = samples.len() / channels;
    let mut input_channels: Vec<Vec<f32>> = vec![Vec::with_capacity(frames_per_channel); channels];

    for (i, &sample) in samples.iter().enumerate() {
        input_channels[i % channels].push(sample);
    }

    let output_channels = resampler.process(&input_channels, None).unwrap();

    let mut output = Vec::new();
    let output_frames = output_channels[0].len();

    for frame in 0..output_frames {
        for ch in 0..channels {
            output.push(output_channels[ch][frame]);
        }
    }

    Ok(output)
}
