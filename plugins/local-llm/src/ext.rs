use std::future::Future;

use tauri::{ipc::Channel, Manager, Runtime};
use tauri_plugin_store2::StorePluginExt;

use crate::local::{ModelManager, SupportedModel};
use hypr_file::{download_file_with_callback, DownloadProgress};

pub trait LocalLlmPluginExt<R: Runtime> {
    fn local_llm_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn current_model(&self) -> impl Future<Output = Result<SupportedModel, crate::Error>>;
    fn api_base(&self) -> impl Future<Output = Option<String>>;
    fn is_model_downloading(&self) -> impl Future<Output = bool>;
    fn is_model_downloaded(&self) -> impl Future<Output = Result<bool, crate::Error>>;
    fn is_server_running(&self) -> impl Future<Output = bool>;
    fn download_model(
        &self,
        channel: Channel<i8>,
    ) -> impl Future<Output = Result<(), crate::Error>>;
    fn start_server(&self) -> impl Future<Output = Result<String, crate::Error>>;
    fn stop_server(&self) -> impl Future<Output = Result<(), crate::Error>>;
}

impl<R: Runtime, T: Manager<R>> LocalLlmPluginExt<R> for T {
    fn local_llm_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    async fn current_model(&self) -> Result<SupportedModel, crate::Error> {
        let store = self.local_llm_store();

        let stored = store
            .get::<Option<SupportedModel>>(crate::StoreKey::Model)?
            .flatten();
        Ok(stored.unwrap_or(SupportedModel::Llama3p2_3bQ4))
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
        let model = self.current_model().await?;

        let data_dir = self.path().app_data_dir().unwrap();
        let path = model.model_path(data_dir);

        if !path.exists() {
            return Ok(false);
        }

        // let size = hypr_file::file_size(&path)?;
        // Ok(size == model.model_size())
        Ok(true)
    }

    #[tracing::instrument(skip_all)]
    async fn is_server_running(&self) -> bool {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;
        s.server.is_some()
    }

    #[tracing::instrument(skip_all)]
    async fn download_model(&self, channel: Channel<i8>) -> Result<(), crate::Error> {
        let model = self.current_model().await?;
        let data_dir = self.path().app_data_dir().unwrap();

        let path = model.model_path(data_dir);
        let url = model.model_url().to_string();

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

            if let Err(e) = download_file_with_callback(url, path, callback).await {
                tracing::error!("model_download_error: {}", e);
                let _ = channel.send(-1);
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
            ModelManager::new(s.model_path.clone())
        };

        let server = crate::server::run_server(model_manager).await?;
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        let api_base = format!("http://{}", &server.addr);

        {
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
}
