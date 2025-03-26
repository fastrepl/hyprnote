use std::future::Future;
use std::path::PathBuf;

use tauri::{ipc::Channel, Manager, Runtime};

#[derive(Debug, Clone)]
pub struct ModelConfig {
    pub dir: PathBuf,
    pub source: rwhisper::WhisperSource,
}

pub trait LocalSttPluginExt<R: Runtime> {
    fn api_base(&self) -> impl Future<Output = Option<String>>;
    fn is_model_downloaded(&self) -> impl Future<Output = Result<bool, crate::Error>>;
    fn is_server_running(&self) -> impl Future<Output = bool>;
    fn start_server(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn stop_server(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn download_config(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn download_tokenizer(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn download_model(&self, c: Channel<u8>) -> impl Future<Output = Result<(), crate::Error>>;
}

impl<R: Runtime, T: Manager<R>> LocalSttPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn api_base(&self) -> Option<String> {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;

        s.api_base.clone()
    }

    #[tracing::instrument(skip_all)]
    async fn is_model_downloaded(&self) -> Result<bool, crate::Error> {
        let model = {
            let state = self.state::<crate::SharedState>();
            let s = state.lock().await;
            s.model.clone()
        };

        let data_dir = self.path().app_data_dir()?;

        for (path, expected) in [
            (model.model_path(&data_dir), model.model_checksum()),
            (model.config_path(&data_dir), model.config_checksum()),
            (model.tokenizer_path(&data_dir), model.tokenizer_checksum()),
        ] {
            if !path.exists() {
                return Ok(false);
            }

            let actual = hypr_file::calculate_file_checksum(path)?;
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
    async fn start_server(&self) -> Result<(), crate::Error> {
        let model = {
            let state = self.state::<crate::SharedState>();
            let s = state.lock().await;
            s.model.clone()
        };

        let cache_dir = self.path().app_data_dir()?;

        let server_state = crate::ServerStateBuilder::default()
            .model_cache_dir(cache_dir)
            .model_type(model.into())
            .build();

        let server = crate::run_server(server_state).await?;

        {
            let state = self.state::<crate::SharedState>();
            let mut s = state.lock().await;
            s.api_base = Some(format!("http://{}", &server.addr));
            s.server = Some(server);
        }

        Ok(())
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
    async fn download_config(&self) -> Result<(), crate::Error> {
        let model = {
            let state = self.state::<crate::SharedState>();
            let s = state.lock().await;
            s.model.clone()
        };

        let data_dir = self.path().app_data_dir()?;

        tokio::spawn(async move {
            let callback = |_: u64, _: u64| {};

            if let Err(e) = hypr_file::download_file_with_callback(
                model.config_url(),
                model.config_path(data_dir),
                callback,
            )
            .await
            {
                tracing::error!("config_download_error: {}", e);
            }
        });

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn download_tokenizer(&self) -> Result<(), crate::Error> {
        let model = {
            let state = self.state::<crate::SharedState>();
            let s = state.lock().await;
            s.model.clone()
        };

        let data_dir = self.path().app_data_dir()?;

        tokio::spawn(async move {
            let callback = |_: u64, _: u64| {};

            if let Err(e) = hypr_file::download_file_with_callback(
                model.tokenizer_url(),
                model.tokenizer_path(data_dir),
                callback,
            )
            .await
            {
                tracing::error!("tokenizer_download_error: {}", e);
            }
        });

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn download_model(&self, channel: Channel<u8>) -> Result<(), crate::Error> {
        let model = {
            let state = self.state::<crate::SharedState>();
            let s = state.lock().await;
            s.model.clone()
        };

        let data_dir = self.path().app_data_dir()?;

        tokio::spawn(async move {
            let callback = |downloaded: u64, total_size: u64| {
                let percent = (downloaded as f64 / total_size as f64) * 100.0;
                let _ = channel.send(percent as u8);
            };

            if let Err(e) = hypr_file::download_file_with_callback(
                model.model_url(),
                model.model_path(data_dir),
                callback,
            )
            .await
            {
                tracing::error!("model_download_error: {}", e);
            }
        });

        Ok(())
    }
}
