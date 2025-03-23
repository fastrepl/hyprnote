use std::future::Future;
use std::path::PathBuf;

use tauri::{ipc::Channel, Manager, Runtime};

pub trait LocalSttPluginExt<R: Runtime> {
    fn is_server_running(&self) -> impl Future<Output = bool>;
    fn api_base(&self) -> impl Future<Output = Option<String>>;
    fn start_server(&self, p: impl Into<PathBuf>) -> impl Future<Output = Result<(), String>>;
    fn stop_server(&self) -> impl Future<Output = Result<(), String>>;
    fn download_config(&self, path: PathBuf) -> impl Future<Output = Result<(), String>>;
    fn download_tokenizer(&self, path: PathBuf) -> impl Future<Output = Result<(), String>>;
    fn download_model(
        &self,
        path: PathBuf,
        channel: Channel<u8>,
    ) -> impl Future<Output = Result<(), String>>;
}

impl<R: Runtime, T: Manager<R>> LocalSttPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn is_server_running(&self) -> bool {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;

        s.server.is_some()
    }

    #[tracing::instrument(skip_all)]
    async fn start_server(&self, cache_dir: impl Into<PathBuf>) -> Result<(), String> {
        let state = self.state::<crate::SharedState>();

        let server = crate::server::run_server(crate::server::ServerState {
            cache_dir: cache_dir.into(),
            model_type: rwhisper::WhisperSource::QuantizedLargeV3Turbo,
        })
        .await
        .map_err(|e| e.to_string())?;

        {
            let mut s = state.lock().await;
            s.api_base = Some(format!("http://{}", &server.addr));
            s.server = Some(server);
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn stop_server(&self) -> Result<(), String> {
        let state = self.state::<crate::SharedState>();
        let mut s = state.lock().await;

        if let Some(server) = s.server.take() {
            let _ = server.shutdown.send(());
        }
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn api_base(&self) -> Option<String> {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;

        s.api_base.clone()
    }

    #[tracing::instrument(skip_all)]
    async fn download_config(&self, path: PathBuf) -> Result<(), String> {
        let url = "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/Demonthos/candle-quantized-whisper-large-v3-turbo/main/config.json";

        tokio::spawn(async move {
            let callback = |_: u64, _: u64| {};

            if let Err(e) = hypr_file::download_file_with_callback(url, path, callback).await {
                tracing::error!("Failed to download config: {}", e);
            }
        });

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn download_tokenizer(&self, path: PathBuf) -> Result<(), String> {
        let url = "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/Demonthos/candle-quantized-whisper-large-v3-turbo/main/tokenizer.json";

        tokio::spawn(async move {
            let callback = |_: u64, _: u64| {};

            if let Err(e) = hypr_file::download_file_with_callback(url, path, callback).await {
                tracing::error!("Failed to download tokenizer: {}", e);
            }
        });

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn download_model(&self, path: PathBuf, channel: Channel<u8>) -> Result<(), String> {
        let url = "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/Demonthos/candle-quantized-whisper-large-v3-turbo/main/model.gguf";

        tokio::spawn(async move {
            let callback = |downloaded: u64, total_size: u64| {
                let percent = (downloaded as f64 / total_size as f64) * 100.0;
                let _ = channel.send(percent as u8);
            };

            if let Err(e) = hypr_file::download_file_with_callback(url, path, callback).await {
                tracing::error!("Failed to download model: {}", e);
            }
        });

        Ok(())
    }
}
