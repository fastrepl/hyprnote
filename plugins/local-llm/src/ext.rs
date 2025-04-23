use std::future::Future;

use hypr_file::{download_file_with_callback, DownloadProgress};
use tauri::{ipc::Channel, Manager, Runtime};
use tauri_plugin_store2::StorePluginExt;

const CURRENT_MODEL: crate::SupportedModel = crate::SupportedModel::Llama3p2_3bQ4;

pub trait LocalLlmPluginExt<R: Runtime> {
    fn local_llm_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn api_base(&self) -> impl Future<Output = Option<String>>;
    fn is_model_downloading(&self) -> impl Future<Output = bool>;
    fn is_model_downloaded(&self) -> impl Future<Output = Result<bool, crate::Error>>;
    fn is_server_running(&self) -> impl Future<Output = bool>;
    fn download_model(&self, channel: Channel<u8>) -> impl Future<Output = Result<(), String>>;
    fn start_server(&self) -> impl Future<Output = Result<String, crate::Error>>;
    fn stop_server(&self) -> impl Future<Output = Result<(), crate::Error>>;
}

impl<R: Runtime, T: Manager<R>> LocalLlmPluginExt<R> for T {
    fn local_llm_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    #[tracing::instrument(skip_all)]
    async fn api_base(&self) -> Option<String> {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;
        s.api_base.clone()
    }

    #[tracing::instrument(skip_all)]
    async fn is_model_downloading(&self) -> bool {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;
        s.download_task.is_some()
    }

    #[tracing::instrument(skip_all)]
    async fn is_model_downloaded(&self) -> Result<bool, crate::Error> {
        let data_dir = self.path().app_data_dir().unwrap();
        let path = CURRENT_MODEL.model_path(data_dir);

        if !path.exists() {
            return Ok(false);
        }

        let size = hypr_file::file_size(&path)?;
        Ok(size == CURRENT_MODEL.model_size())
    }

    #[tracing::instrument(skip_all)]
    async fn is_server_running(&self) -> bool {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;
        s.server.is_some()
    }

    #[tracing::instrument(skip_all)]
    async fn download_model(&self, channel: Channel<u8>) -> Result<(), String> {
        let data_dir = self.path().app_data_dir().unwrap();
        let path = CURRENT_MODEL.model_path(data_dir);
        let url = CURRENT_MODEL.model_url();

        let task = tokio::spawn(async move {
            let callback = |progress: DownloadProgress| match progress {
                DownloadProgress::Started => {
                    let _ = channel.send(0);
                }
                DownloadProgress::Progress(downloaded, total_size) => {
                    let percent = (downloaded as f64 / total_size as f64) * 100.0;
                    let _ = channel.send(percent as u8);
                }
                DownloadProgress::Finished => {
                    let _ = channel.send(100);
                }
            };

            if let Err(e) = download_file_with_callback(url, path, callback).await {
                tracing::error!("Failed to download model: {}", e);
            }
        });

        {
            let state = self.state::<crate::SharedState>();
            let mut s = state.lock().await;

            if let Some(task) = s.download_task.take() {
                task.abort();
            }
            s.download_task = Some(task);
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn start_server(&self) -> Result<String, crate::Error> {
        let state = self.state::<crate::SharedState>();

        let model_manager = {
            let s = state.lock().await;
            crate::ModelManager::new(s.model_path.clone())
        };

        let server = crate::server::run_server(model_manager).await?;

        let mut s = state.lock().await;
        let api_base = format!("http://{}", &server.addr);
        s.api_base = Some(api_base.clone());
        s.server = Some(server);
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
}
