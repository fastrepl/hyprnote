use std::{collections::HashMap, future::Future, path::PathBuf};

use tauri::{ipc::Channel, Manager, Runtime};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_store2::StorePluginExt;

use hypr_download_interface::DownloadProgress;
use hypr_file::download_file_parallel;
use hypr_whisper_local_model::WhisperModel;

use crate::{
    model::SupportedSttModel,
    server::{external, internal, ServerType},
    Connection,
};

pub trait LocalSttPluginExt<R: Runtime> {
    fn local_stt_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn models_dir(&self) -> PathBuf;
    fn list_ggml_backends(&self) -> Vec<hypr_whisper_local::GgmlBackend>;

    fn get_connection(&self) -> impl Future<Output = Result<Connection, crate::Error>>;

    fn start_server(
        &self,
        model: Option<SupportedSttModel>,
    ) -> impl Future<Output = Result<String, crate::Error>>;
    fn stop_server(
        &self,
        server_type: Option<ServerType>,
    ) -> impl Future<Output = Result<bool, crate::Error>>;
    fn get_servers(
        &self,
    ) -> impl Future<Output = Result<HashMap<ServerType, Option<String>>, crate::Error>>;

    fn get_current_model(&self) -> Result<SupportedSttModel, crate::Error>;
    fn set_current_model(
        &self,
        model: SupportedSttModel,
    ) -> impl Future<Output = Result<(), crate::Error>>;

    fn download_model(
        &self,
        model: SupportedSttModel,
        channel: Channel<i8>,
    ) -> impl Future<Output = Result<(), crate::Error>>;

    fn is_model_downloading(&self, model: &SupportedSttModel) -> impl Future<Output = bool>;
    fn is_model_downloaded(
        &self,
        model: &SupportedSttModel,
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

    async fn get_connection(&self) -> Result<Connection, crate::Error> {
        let model = self.get_current_model()?;

        let am_key = {
            let state = self.state::<crate::SharedState>();
            let key = state.lock().await.am_api_key.clone();
            key.clone().ok_or(crate::Error::AmApiKeyNotSet)?
        };

        match model {
            SupportedSttModel::Am(_) => {
                let existing_api_base = {
                    let state = self.state::<crate::SharedState>();
                    let guard = state.lock().await;
                    guard.external_server.as_ref().map(|s| s.base_url.clone())
                };

                let conn = match existing_api_base {
                    Some(api_base) => Connection {
                        base_url: api_base,
                        api_key: Some(am_key),
                    },
                    None => {
                        let api_base = self.start_server(Some(model)).await?;
                        Connection {
                            base_url: api_base,
                            api_key: Some(am_key),
                        }
                    }
                };
                Ok(conn)
            }
            SupportedSttModel::Whisper(_) => {
                let existing_api_base = {
                    let state = self.state::<crate::SharedState>();
                    let guard = state.lock().await;
                    guard.internal_server.as_ref().map(|s| s.base_url.clone())
                };

                let conn = match existing_api_base {
                    Some(api_base) => Connection {
                        base_url: api_base,
                        api_key: None,
                    },
                    None => {
                        let api_base = self.start_server(Some(model)).await?;
                        Connection {
                            base_url: api_base,
                            api_key: None,
                        }
                    }
                };
                Ok(conn)
            }
        }
    }

    async fn is_model_downloaded(&self, model: &SupportedSttModel) -> Result<bool, crate::Error> {
        match model {
            SupportedSttModel::Am(model) => Ok(model.is_downloaded(self.models_dir())?),
            SupportedSttModel::Whisper(model) => {
                let model_path = self.models_dir().join(model.file_name());

                for (path, expected) in [(model_path, model.model_size_bytes())] {
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
        }
    }

    #[tracing::instrument(skip_all)]
    async fn start_server(&self, model: Option<SupportedSttModel>) -> Result<String, crate::Error> {
        let model = match model {
            Some(m) => m,
            None => self.get_current_model()?,
        };

        let t = match &model {
            SupportedSttModel::Am(_) => ServerType::External,
            SupportedSttModel::Whisper(_) => ServerType::Internal,
        };

        let cache_dir = self.models_dir();
        let data_dir = self.app_handle().path().app_data_dir().unwrap().join("stt");

        match t {
            ServerType::Internal => {
                if !self.is_model_downloaded(&model).await? {
                    return Err(crate::Error::ModelNotDownloaded);
                }

                if self
                    .state::<crate::SharedState>()
                    .lock()
                    .await
                    .internal_server
                    .is_some()
                {
                    return Err(crate::Error::ServerAlreadyRunning);
                }

                let whisper_model = match model {
                    SupportedSttModel::Whisper(m) => m,
                    SupportedSttModel::Am(_) => {
                        return Err(crate::Error::UnsupportedModelType);
                    }
                };

                let server_state = internal::ServerState::builder()
                    .model_cache_dir(cache_dir)
                    .model_type(whisper_model)
                    .build();

                let server = internal::run_server(server_state).await?;
                let base_url = server.base_url.clone();
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;

                {
                    let state = self.state::<crate::SharedState>();
                    let mut s = state.lock().await;
                    s.internal_server = Some(server);
                }

                Ok(base_url)
            }
            ServerType::External => {
                if self
                    .state::<crate::SharedState>()
                    .lock()
                    .await
                    .external_server
                    .is_some()
                {
                    return Err(crate::Error::ServerAlreadyRunning);
                }

                let am_model = match model {
                    SupportedSttModel::Am(m) => m,
                    SupportedSttModel::Whisper(_) => {
                        return Err(crate::Error::UnsupportedModelType);
                    }
                };

                let am_key = {
                    let state = self.state::<crate::SharedState>();
                    let key = state.lock().await.am_api_key.clone();
                    key.clone().ok_or(crate::Error::AmApiKeyNotSet)?
                };

                let cmd: tauri_plugin_shell::process::Command = {
                    #[cfg(debug_assertions)]
                    {
                        let passthrough_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                            .join("../../internal/passthrough-aarch64-apple-darwin");
                        let stt_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                            .join("../../internal/stt-aarch64-apple-darwin");

                        if !passthrough_path.exists() || !stt_path.exists() {
                            return Err(crate::Error::AmBinaryNotFound);
                        }

                        self.shell()
                            .command(passthrough_path)
                            .current_dir(dirs::home_dir().unwrap())
                            .arg(stt_path)
                            .args(["serve", "-v", "-d"])
                    }

                    #[cfg(not(debug_assertions))]
                    self.shell()
                        .command(
                            tauri::utils::platform::current_exe()?
                                .parent()
                                .unwrap()
                                .join("stt"),
                        )
                        .current_dir(dirs::home_dir().unwrap())
                        .args(["serve", "-v"])
                };

                let server = external::run_server(cmd, am_key).await?;
                tokio::time::sleep(std::time::Duration::from_millis(250)).await;
                let _ = server.init(am_model, data_dir).await;
                let api_base = server.base_url.clone();

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
                    let _ = server.terminate();
                    stopped = true;
                }
            }
            Some(ServerType::Internal) => {
                if let Some(server) = s.internal_server.take() {
                    let _ = server.terminate();
                    stopped = true;
                }
            }
            None => {
                if let Some(server) = s.external_server.take() {
                    let _ = server.terminate();
                    stopped = true;
                }
                if let Some(server) = s.internal_server.take() {
                    let _ = server.terminate();
                    stopped = true;
                }
            }
        }

        Ok(stopped)
    }

    #[tracing::instrument(skip_all)]
    async fn get_servers(&self) -> Result<HashMap<ServerType, Option<String>>, crate::Error> {
        let state = self.state::<crate::SharedState>();
        let guard = state.lock().await;

        let internal_url = if let Some(server) = &guard.internal_server {
            if server.health().await {
                Some(server.base_url.clone())
            } else {
                None
            }
        } else {
            None
        };

        let external_url = if let Some(server) = &guard.external_server {
            if server.health().await {
                Some(server.base_url.clone())
            } else {
                None
            }
        } else {
            None
        };

        Ok([
            (ServerType::Internal, internal_url),
            (ServerType::External, external_url),
        ]
        .into_iter()
        .collect())
    }

    #[tracing::instrument(skip_all)]
    async fn download_model(
        &self,
        model: SupportedSttModel,
        channel: Channel<i8>,
    ) -> Result<(), crate::Error> {
        let create_progress_callback = |channel: Channel<i8>| {
            move |progress: DownloadProgress| match progress {
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
            }
        };

        match model.clone() {
            SupportedSttModel::Am(m) => {
                let tar_path = self.models_dir().join(format!("{}.tar", m.model_dir()));
                let final_path = self.models_dir();

                let task = tokio::spawn(async move {
                    let callback = create_progress_callback(channel.clone());

                    if let Err(e) = download_file_parallel(m.tar_url(), &tar_path, callback).await {
                        tracing::error!("model_download_error: {}", e);
                        let _ = channel.send(-1);
                        return;
                    }

                    if let Err(e) = m.tar_verify_and_unpack(&tar_path, &final_path) {
                        tracing::error!("model_unpack_error: {}", e);
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
            SupportedSttModel::Whisper(m) => {
                let model_path = self.models_dir().join(m.file_name());

                let task = tokio::spawn(async move {
                    let callback = create_progress_callback(channel.clone());

                    if let Err(e) =
                        download_file_parallel(m.model_url(), &model_path, callback).await
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
        }
    }

    #[tracing::instrument(skip_all)]
    async fn is_model_downloading(&self, model: &SupportedSttModel) -> bool {
        let state = self.state::<crate::SharedState>();

        {
            let guard = state.lock().await;
            guard.download_task.contains_key(model)
        }
    }

    #[tracing::instrument(skip_all)]
    fn get_current_model(&self) -> Result<SupportedSttModel, crate::Error> {
        let store = self.local_stt_store();
        let model = store.get(crate::StoreKey::DefaultModel)?;
        Ok(model.unwrap_or(SupportedSttModel::Whisper(WhisperModel::QuantizedBase)))
    }

    #[tracing::instrument(skip_all)]
    async fn set_current_model(&self, model: SupportedSttModel) -> Result<(), crate::Error> {
        let store = self.local_stt_store();
        store.set(crate::StoreKey::DefaultModel, model.clone())?;
        self.stop_server(None).await?;
        self.start_server(Some(model)).await?;
        Ok(())
    }
}
