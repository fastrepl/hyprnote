use std::{collections::HashMap, future::Future, path::PathBuf, sync::Arc};

use ractor::{call_t, registry, ActorRef};
use tokio_util::sync::CancellationToken;

use tauri::{ipc::Channel, Manager, Runtime};
use tauri_plugin_shell::ShellExt;

use hypr_download_interface::DownloadProgress;
use hypr_file::download_file_parallel_cancellable;

use crate::{
    model::SupportedSttModel,
    server::{external, internal, supervisor, ServerInfo, ServerStatus, ServerType},
};

pub trait LocalSttPluginExt<R: Runtime> {
    fn models_dir(&self) -> PathBuf;
    fn list_ggml_backends(&self) -> Vec<hypr_whisper_local::GgmlBackend>;

    fn get_supervisor(
        &self,
    ) -> impl Future<Output = Result<supervisor::SupervisorRef, crate::Error>>;

    fn start_server(
        &self,
        model: SupportedSttModel,
    ) -> impl Future<Output = Result<String, crate::Error>>;
    fn stop_server(
        &self,
        server_type: Option<ServerType>,
    ) -> impl Future<Output = Result<bool, crate::Error>>;
    fn get_servers(
        &self,
    ) -> impl Future<Output = Result<HashMap<ServerType, ServerInfo>, crate::Error>>;

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
    fn models_dir(&self) -> PathBuf {
        use tauri::path::BaseDirectory;
        self.path()
            .resolve("hyprnote/models/stt", BaseDirectory::Data)
            .unwrap_or_else(|_| {
                dirs::data_dir()
                    .unwrap_or_default()
                    .join("hyprnote")
                    .join("models")
                    .join("stt")
            })
    }

    fn list_ggml_backends(&self) -> Vec<hypr_whisper_local::GgmlBackend> {
        hypr_whisper_local::list_ggml_backends()
    }

    async fn get_supervisor(&self) -> Result<supervisor::SupervisorRef, crate::Error> {
        let state = self.state::<crate::SharedState>();
        let guard = state.lock().await;
        guard
            .stt_supervisor
            .clone()
            .ok_or(crate::Error::SupervisorNotFound)
    }

    async fn is_model_downloaded(&self, model: &SupportedSttModel) -> Result<bool, crate::Error> {
        match model {
            SupportedSttModel::Am(model) => Ok(model.is_downloaded(self.models_dir())?),
            SupportedSttModel::Whisper(model) => {
                let model_path = self.models_dir().join(model.file_name());

                {
                    let (path, expected) = (model_path, model.model_size_bytes());
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
    async fn start_server(&self, model: SupportedSttModel) -> Result<String, crate::Error> {
        let server_type = match &model {
            SupportedSttModel::Am(_) => ServerType::External,
            SupportedSttModel::Whisper(_) => ServerType::Internal,
        };

        let current_info = match server_type {
            ServerType::Internal => internal_health().await,
            ServerType::External => external_health().await,
        };

        if let Some(info) = current_info.as_ref() {
            if info.model.as_ref() == Some(&model) {
                if let Some(url) = info.url.clone() {
                    return Ok(url);
                }

                return Err(crate::Error::ServerStartFailed(
                    "missing_health_url".to_string(),
                ));
            }
        }

        if matches!(server_type, ServerType::Internal) && !self.is_model_downloaded(&model).await? {
            return Err(crate::Error::ModelNotDownloaded);
        }

        let supervisor = self.get_supervisor().await?;

        supervisor::stop_all_stt_servers(&supervisor)
            .await
            .map_err(|e| crate::Error::ServerStopFailed(e.to_string()))?;

        match server_type {
            ServerType::Internal => {
                let cache_dir = self.models_dir();
                let whisper_model = match model {
                    SupportedSttModel::Whisper(m) => m,
                    _ => return Err(crate::Error::UnsupportedModelType),
                };

                start_internal_server(&supervisor, cache_dir, whisper_model).await
            }
            ServerType::External => {
                let data_dir = self.models_dir();
                let am_model = match model {
                    SupportedSttModel::Am(m) => m,
                    _ => return Err(crate::Error::UnsupportedModelType),
                };

                start_external_server(self, &supervisor, data_dir, am_model).await
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn stop_server(&self, server_type: Option<ServerType>) -> Result<bool, crate::Error> {
        let supervisor = self.get_supervisor().await?;

        match server_type {
            Some(t) => {
                supervisor::stop_stt_server(&supervisor, t)
                    .await
                    .map_err(|e| crate::Error::ServerStopFailed(e.to_string()))?;
                Ok(true)
            }
            None => {
                supervisor::stop_all_stt_servers(&supervisor)
                    .await
                    .map_err(|e| crate::Error::ServerStopFailed(e.to_string()))?;
                Ok(true)
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn get_servers(&self) -> Result<HashMap<ServerType, ServerInfo>, crate::Error> {
        let internal_info = internal_health().await.unwrap_or(ServerInfo {
            url: None,
            status: ServerStatus::Unreachable,
            model: None,
        });

        let external_info = external_health().await.unwrap_or(ServerInfo {
            url: None,
            status: ServerStatus::Unreachable,
            model: None,
        });

        Ok([
            (ServerType::Internal, internal_info),
            (ServerType::External, external_info),
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
        {
            let existing = {
                let state = self.state::<crate::SharedState>();
                let mut s = state.lock().await;
                s.download_task.remove(&model)
            };

            if let Some((existing_task, existing_token)) = existing {
                // Cancel the download and wait for task to finish
                existing_token.cancel();
                let _ = existing_task.await;
            }
        }

        let create_progress_callback = |channel: Channel<i8>| {
            let last_progress = std::sync::Arc::new(std::sync::Mutex::new(0i8));

            move |progress: DownloadProgress| {
                let mut last = last_progress.lock().unwrap();

                match progress {
                    DownloadProgress::Started => {
                        *last = 0;
                        let _ = channel.send(0);
                    }
                    DownloadProgress::Progress(downloaded, total_size) => {
                        let percent = (downloaded as f64 / total_size as f64) * 100.0;
                        let current = percent as i8;

                        if current > *last {
                            *last = current;
                            let _ = channel.send(current);
                        }
                    }
                    DownloadProgress::Finished => {
                        *last = 100;
                        let _ = channel.send(100);
                    }
                }
            }
        };

        match model.clone() {
            SupportedSttModel::Am(m) => {
                let tar_path = self.models_dir().join(format!("{}.tar", m.model_dir()));
                let final_path = self.models_dir();
                let cancellation_token = CancellationToken::new();
                let token_clone = cancellation_token.clone();

                let task = tokio::spawn(async move {
                    let callback = create_progress_callback(channel.clone());

                    if let Err(e) = download_file_parallel_cancellable(
                        m.tar_url(),
                        &tar_path,
                        callback,
                        Some(token_clone),
                    )
                    .await
                    {
                        if !matches!(e, hypr_file::Error::Cancelled) {
                            tracing::error!("model_download_error: {}", e);
                            let _ = channel.send(-1);
                        }
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
                    s.download_task
                        .insert(model.clone(), (task, cancellation_token));
                }

                Ok(())
            }
            SupportedSttModel::Whisper(m) => {
                let model_path = self.models_dir().join(m.file_name());
                let cancellation_token = CancellationToken::new();
                let token_clone = cancellation_token.clone();

                let task = tokio::spawn(async move {
                    let callback = create_progress_callback(channel.clone());

                    if let Err(e) = download_file_parallel_cancellable(
                        m.model_url(),
                        &model_path,
                        callback,
                        Some(token_clone),
                    )
                    .await
                    {
                        if !matches!(e, hypr_file::Error::Cancelled) {
                            tracing::error!("model_download_error: {}", e);
                            let _ = channel.send(-1);
                        }
                        return;
                    }

                    let checksum = hypr_file::calculate_file_checksum(&model_path).unwrap();

                    if checksum != m.checksum() {
                        tracing::error!("model_download_error: checksum mismatch");
                        std::fs::remove_file(&model_path).unwrap();
                        let _ = channel.send(-1);
                    }
                });

                {
                    let state = self.state::<crate::SharedState>();
                    let mut s = state.lock().await;
                    s.download_task
                        .insert(model.clone(), (task, cancellation_token));
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
}

async fn start_internal_server(
    supervisor: &supervisor::SupervisorRef,
    cache_dir: PathBuf,
    model: hypr_whisper_local_model::WhisperModel,
) -> Result<String, crate::Error> {
    supervisor::start_internal_stt(
        supervisor,
        internal::InternalSTTArgs {
            model_cache_dir: cache_dir,
            model_type: model,
        },
    )
    .await
    .map_err(|e| crate::Error::ServerStartFailed(e.to_string()))?;

    internal_health()
        .await
        .and_then(|info| info.url)
        .ok_or_else(|| crate::Error::ServerStartFailed("empty_health".to_string()))
}

async fn start_external_server<R: Runtime, T: Manager<R>>(
    manager: &T,
    supervisor: &supervisor::SupervisorRef,
    data_dir: PathBuf,
    model: hypr_am::AmModel,
) -> Result<String, crate::Error> {
    let am_key = {
        let state = manager.state::<crate::SharedState>();
        let key = {
            let guard = state.lock().await;
            guard.am_api_key.clone()
        };

        key.filter(|k| !k.is_empty())
            .ok_or(crate::Error::AmApiKeyNotSet)?
    };

    let port = port_check::free_local_port()
        .ok_or_else(|| crate::Error::ServerStartFailed("failed_to_find_free_port".to_string()))?;

    let app_handle = manager.app_handle().clone();
    let cmd_builder = {
        #[cfg(debug_assertions)]
        {
            let passthrough_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../../apps/desktop/src-tauri/resources/passthrough-aarch64-apple-darwin");
            let stt_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../../apps/desktop/src-tauri/resources/stt-aarch64-apple-darwin");

            if !passthrough_path.exists() || !stt_path.exists() {
                return Err(crate::Error::AmBinaryNotFound);
            }

            let passthrough_path = Arc::new(passthrough_path);
            let stt_path = Arc::new(stt_path);
            external::CommandBuilder::new(move || {
                app_handle
                    .shell()
                    .command(passthrough_path.as_ref())
                    .current_dir(dirs::home_dir().unwrap())
                    .arg(stt_path.as_ref())
                    .args(["serve", "--any-token", "-v", "-d"])
            })
        }

        #[cfg(not(debug_assertions))]
        {
            external::CommandBuilder::new(move || {
                app_handle
                    .shell()
                    .sidecar("stt")
                    .expect("failed to create sidecar command")
                    .current_dir(dirs::home_dir().unwrap())
                    .args(["serve", "--any-token"])
            })
        }
    };

    supervisor::start_external_stt(
        supervisor,
        external::ExternalSTTArgs::new(cmd_builder, am_key, model, data_dir, port),
    )
    .await
    .map_err(|e| crate::Error::ServerStartFailed(e.to_string()))?;

    external_health()
        .await
        .and_then(|info| info.url)
        .ok_or_else(|| crate::Error::ServerStartFailed("empty_health".to_string()))
}

async fn internal_health() -> Option<ServerInfo> {
    match registry::where_is(internal::InternalSTTActor::name()) {
        Some(cell) => {
            let actor: ActorRef<internal::InternalSTTMessage> = cell.into();
            match call_t!(actor, internal::InternalSTTMessage::GetHealth, 10 * 1000) {
                Ok(info) => Some(info),
                Err(_) => None,
            }
        }
        None => None,
    }
}

async fn external_health() -> Option<ServerInfo> {
    match registry::where_is(external::ExternalSTTActor::name()) {
        Some(cell) => {
            let actor: ActorRef<external::ExternalSTTMessage> = cell.into();
            match call_t!(actor, external::ExternalSTTMessage::GetHealth, 10 * 1000) {
                Ok(info) => Some(info),
                Err(_) => None,
            }
        }
        None => None,
    }
}
