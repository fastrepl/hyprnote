use std::{future::Future, path::PathBuf};

use tauri::{ipc::Channel, Manager, Runtime};
use tauri_plugin_store2::StorePluginExt;

use hypr_file::{download_file_with_callback, DownloadProgress};

pub trait LocalLlmPluginExt<R: Runtime> {
    fn local_llm_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;

    fn models_dir(&self) -> PathBuf;
    fn api_base(&self) -> impl Future<Output = Option<String>>;

    fn is_server_running(&self) -> impl Future<Output = bool>;
    fn start_server(&self) -> impl Future<Output = Result<String, crate::Error>>;
    fn stop_server(&self) -> impl Future<Output = Result<(), crate::Error>>;

    fn list_downloaded_model(
        &self,
    ) -> impl Future<Output = Result<Vec<crate::SupportedModel>, crate::Error>>;
    fn get_current_model(&self) -> Result<crate::SupportedModel, crate::Error>;
    fn set_current_model(&self, model: crate::SupportedModel) -> Result<(), crate::Error>;

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

impl<R: Runtime, T: Manager<R>> LocalLlmPluginExt<R> for T {
    fn local_llm_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn models_dir(&self) -> PathBuf {
        self.path().app_data_dir().unwrap().join("ttt")
    }

    #[tracing::instrument(skip_all)]
    async fn api_base(&self) -> Option<String> {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;
        s.api_base.clone()
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
    async fn is_model_downloaded(
        &self,
        model: &crate::SupportedModel,
    ) -> Result<bool, crate::Error> {
        let path = self.models_dir().join(model.file_name());

        if !path.exists() {
            return Ok(false);
        }

        let actual = hypr_file::file_size(path)?;
        if actual != model.model_size() {
            return Ok(false);
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
    async fn download_model(
        &self,
        model: crate::SupportedModel,
        channel: Channel<i8>,
    ) -> Result<(), crate::Error> {
        let m = model.clone();
        let path = self.models_dir().join(m.file_name());

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

            if let Err(e) = download_file_with_callback(m.model_url(), path, callback).await {
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
    async fn list_downloaded_model(&self) -> Result<Vec<crate::SupportedModel>, crate::Error> {
        let models_dir = self.models_dir();

        if !models_dir.exists() {
            return Ok(vec![]);
        }

        let mut models = Vec::new();

        for entry in models_dir.read_dir()? {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => {
                    continue;
                }
            };

            let file_name = entry.file_name();
            let file_name_str = file_name.to_string_lossy();

            if let Some(model) = crate::model::SUPPORTED_MODELS
                .iter()
                .find(|model| model.file_name() == file_name_str)
            {
                if entry.path().is_file() {
                    models.push(model.clone());
                }
            }
        }

        Ok(models)
    }

    #[tracing::instrument(skip_all)]
    async fn start_server(&self) -> Result<String, crate::Error> {
        let current_model = self.get_current_model()?;

        let model_path = self.models_dir().join(current_model.file_name());
        let model_manager = crate::ModelManager::new(model_path);
        let state = self.state::<crate::SharedState>();

        let server_state = crate::ServerState::new(model_manager);
        let server = crate::server::run_server(server_state).await?;
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

    #[tracing::instrument(skip_all)]
    fn get_current_model(&self) -> Result<crate::SupportedModel, crate::Error> {
        let store = self.local_llm_store();
        let model = store.get(crate::StoreKey::Model)?;

        match model {
            Some(existing_model) => Ok(existing_model),
            None => {
                let is_migrated: Option<bool> = store.get(crate::StoreKey::DefaultModelMigrated)?;

                if is_migrated.unwrap_or(false) {
                    Ok(crate::SupportedModel::HyprLLM)
                } else {
                    // Preserve existing users' workflow by keeping their downloaded model
                    let old_model_path = self
                        .models_dir()
                        .join(crate::SupportedModel::Llama3p2_3bQ4.file_name());

                    if old_model_path.exists() {
                        let _ =
                            store.set(crate::StoreKey::Model, crate::SupportedModel::Llama3p2_3bQ4);
                        let _ = store.set(crate::StoreKey::DefaultModelMigrated, true);
                        Ok(crate::SupportedModel::Llama3p2_3bQ4)
                    } else {
                        let _ = store.set(crate::StoreKey::DefaultModelMigrated, true);
                        Ok(crate::SupportedModel::HyprLLM)
                    }
                }
            }
        }
    }

    #[tracing::instrument(skip_all)]
    fn set_current_model(&self, model: crate::SupportedModel) -> Result<(), crate::Error> {
        let store = self.local_llm_store();
        store.set(crate::StoreKey::Model, model)?;
        Ok(())
    }
}
