use std::future::Future;

use tauri::{ipc::Channel, Manager, Runtime};
use tauri_plugin_store2::StorePluginExt;

use hypr_file::{download_file_with_callback, DownloadProgress};
use hypr_listener_interface::Word;

pub trait LocalSttPluginExt<R: Runtime> {
    fn local_stt_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn api_base(&self) -> impl Future<Output = Option<String>>;
    fn is_server_running(&self) -> impl Future<Output = bool>;
    fn start_server(&self) -> impl Future<Output = Result<String, crate::Error>>;
    fn stop_server(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn get_current_model(&self) -> Result<crate::SupportedModel, crate::Error>;
    fn set_current_model(&self, model: crate::SupportedModel) -> Result<(), crate::Error>;

    fn process_wav(
        &self,
        model_path: impl AsRef<std::path::Path>,
        audio_path: impl AsRef<std::path::Path>,
    ) -> impl Future<Output = Result<Vec<Word>, crate::Error>>;

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
        let data_dir = self.path().app_data_dir()?;

        for (path, expected) in [(model.model_path(&data_dir), model.model_size())] {
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
        let cache_dir = self.path().app_data_dir()?;
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
        let data_dir = self.path().app_data_dir()?;

        let m = model.clone();
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

            if let Err(e) =
                download_file_with_callback(m.model_url(), m.model_path(&data_dir), callback).await
            {
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
    async fn process_wav(
        &self,
        model_path: impl AsRef<std::path::Path>,
        audio_path: impl AsRef<std::path::Path>,
    ) -> Result<Vec<Word>, crate::Error> {
        let mut wav = hound::WavReader::open(audio_path.as_ref()).unwrap();
        let samples = wav.samples::<i16>().collect::<Result<Vec<_>, _>>().unwrap();

        let mut model = hypr_whisper::local::Whisper::builder()
            .model_path(model_path.as_ref().to_str().unwrap())
            .language(hypr_whisper::Language::En)
            .static_prompt("")
            .dynamic_prompt("")
            .build();

        // TODO
        // https://github.com/thewh1teagle/pyannote-rs/issues/13

        // let mut segmenter = hypr_pyannote::local::segmentation::Segmenter::new(16000).unwrap();
        // let segments = segmenter.process(&samples, 16000).unwrap();

        let mut words = Vec::new();

        // for segment in segments {
        //     let audio_f32 = hypr_audio_utils::i16_to_f32_samples(&segment.samples);

        //     let whisper_segments = model.transcribe(&audio_f32).unwrap();

        //     for whisper_segment in whisper_segments {
        //         let start_sec: f64 = segment.start + (whisper_segment.start() as f64);
        //         let end_sec: f64 = segment.start + (whisper_segment.end() as f64);
        //         let start_ms = (start_sec * 1000.0) as u64;
        //         let end_ms = (end_sec * 1000.0) as u64;

        //         words.push(Word {
        //             text: whisper_segment.text().to_string(),
        //             speaker: None,
        //             confidence: Some(whisper_segment.confidence()),
        //             start_ms: Some(start_ms),
        //             end_ms: Some(end_ms),
        //         });
        //     }
        // }

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
