use std::{future::Future, path::PathBuf};

use tauri::{ipc::Channel, Manager, Runtime};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_store2::StorePluginExt;

use hypr_file::{download_file_parallel, DownloadProgress};
use hypr_whisper_local_model::WhisperModel;

use crate::server::{external, internal, ServerType};

pub trait LocalSttPluginExt<R: Runtime> {
    fn local_stt_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn models_dir(&self) -> PathBuf;
    fn list_ggml_backends(&self) -> Vec<hypr_whisper_local::GgmlBackend>;

    fn get_api_base(
        &self,
        server_type: Option<ServerType>,
    ) -> impl Future<Output = Result<Option<String>, crate::Error>>;
    fn start_server(
        &self,
        server_type: Option<ServerType>,
    ) -> impl Future<Output = Result<String, crate::Error>>;
    fn stop_server(
        &self,
        server_type: Option<ServerType>,
    ) -> impl Future<Output = Result<bool, crate::Error>>;

    fn get_current_model(&self) -> Result<WhisperModel, crate::Error>;
    fn set_current_model(&self, model: WhisperModel) -> Result<(), crate::Error>;

    fn download_model(
        &self,
        model: WhisperModel,
        channel: Channel<i8>,
    ) -> impl Future<Output = Result<(), crate::Error>>;

    fn is_model_downloading(&self, model: &WhisperModel) -> impl Future<Output = bool>;
    fn is_model_downloaded(
        &self,
        model: &WhisperModel,
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

    async fn is_model_downloaded(&self, model: &WhisperModel) -> Result<bool, crate::Error> {
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
    async fn get_api_base(
        &self,
        server_type: Option<ServerType>,
    ) -> Result<Option<String>, crate::Error> {
        let state = self.state::<crate::SharedState>();
        let guard = state.lock().await;

        let internal_api_base = guard.internal_server.as_ref().map(|s| s.api_base.clone());
        let external_api_base = guard.external_server.as_ref().map(|s| s.api_base.clone());

        match server_type {
            Some(ServerType::Internal) => Ok(internal_api_base),
            Some(ServerType::External) => Ok(external_api_base),
            None => {
                if let Some(external_api_base) = external_api_base {
                    Ok(Some(external_api_base))
                } else if let Some(internal_api_base) = internal_api_base {
                    Ok(Some(internal_api_base))
                } else {
                    Ok(None)
                }
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn start_server(&self, server_type: Option<ServerType>) -> Result<String, crate::Error> {
        let t = server_type.unwrap_or(ServerType::Internal);

        match t {
            ServerType::Internal => {
                let cache_dir = self.models_dir();
                let model = self.get_current_model()?;

                if !self.is_model_downloaded(&model).await? {
                    return Err(crate::Error::ModelNotDownloaded);
                }

                let server_state = internal::ServerState::builder()
                    .model_cache_dir(cache_dir)
                    .model_type(model)
                    .build();

                let server = internal::run_server(server_state).await?;
                let api_base = server.api_base.clone();
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;

                {
                    let state = self.state::<crate::SharedState>();
                    let mut s = state.lock().await;
                    s.internal_server = Some(server);
                }

                Ok(api_base)
            }
            ServerType::External => {
                let cmd = self.shell().sidecar("stt")?;

                let server = external::run_server(cmd).await?;
                let api_base = server.api_base.clone();
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;

                {
                    let state = self.state::<crate::SharedState>();
                    let mut s = state.lock().await;
                    s.external_server = Some(server);
                }

                Ok(api_base)
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn stop_server(&self, server_type: Option<ServerType>) -> Result<bool, crate::Error> {
        let state = self.state::<crate::SharedState>();
        let mut s = state.lock().await;

        let mut stopped = false;
        match server_type {
            Some(ServerType::External) => {
                if let Some(server) = s.external_server.take() {
                    let _ = server.shutdown.send(());
                    stopped = true;
                }
            }
            Some(ServerType::Internal) => {
                if let Some(server) = s.internal_server.take() {
                    let _ = server.shutdown.send(());
                    stopped = true;
                }
            }
            None => {
                if let Some(server) = s.external_server.take() {
                    let _ = server.shutdown.send(());
                    stopped = true;
                }
                if let Some(server) = s.internal_server.take() {
                    let _ = server.shutdown.send(());
                    stopped = true;
                }
            }
        }

        Ok(stopped)
    }

    #[tracing::instrument(skip_all)]
    async fn download_model(
        &self,
        model: WhisperModel,
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

            if let Err(e) = download_file_parallel(m.model_url(), model_path, callback).await {
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
    async fn is_model_downloading(&self, model: &WhisperModel) -> bool {
        let state = self.state::<crate::SharedState>();

        {
            let guard = state.lock().await;
            guard.download_task.contains_key(model)
        }
    }

    #[tracing::instrument(skip_all)]
    fn get_current_model(&self) -> Result<WhisperModel, crate::Error> {
        let store = self.local_stt_store();
        let model = store.get(crate::StoreKey::DefaultModel)?;
        Ok(model.unwrap_or(WhisperModel::QuantizedBaseEn))
    }

    #[tracing::instrument(skip_all)]
    fn set_current_model(&self, model: WhisperModel) -> Result<(), crate::Error> {
        let store = self.local_stt_store();
        store.set(crate::StoreKey::DefaultModel, model)?;
        Ok(())
    }
}
