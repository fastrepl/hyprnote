use std::{collections::HashMap, future::Future, path::PathBuf, time::Duration};

use ractor::{call_t, registry, Actor, ActorRef};
use tokio::time::sleep;
use tokio_util::sync::CancellationToken;

use tauri::{ipc::Channel, Manager, Runtime};
use tauri_plugin_shell::ShellExt;

use hypr_download_interface::DownloadProgress;
use hypr_file::download_file_parallel_cancellable;

use crate::{
    model::SupportedSttModel,
    server::{external, internal, ServerInfo, ServerStatus, ServerType},
};

pub trait LocalSttPluginExt<R: Runtime> {
    fn models_dir(&self) -> PathBuf;
    fn list_ggml_backends(&self) -> Vec<hypr_whisper_local::GgmlBackend>;

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
        self.path().app_data_dir().unwrap().join("stt")
    }

    fn list_ggml_backends(&self) -> Vec<hypr_whisper_local::GgmlBackend> {
        hypr_whisper_local::list_ggml_backends()
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
    async fn start_server(&self, model: SupportedSttModel) -> Result<String, crate::Error> {
        let t = match &model {
            SupportedSttModel::Am(_) => ServerType::External,
            SupportedSttModel::Whisper(_) => ServerType::Internal,
        };

        let current_info = match t {
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

        if matches!(t, ServerType::Internal) && !self.is_model_downloaded(&model).await? {
            return Err(crate::Error::ModelNotDownloaded);
        }

        let am_key = if matches!(t, ServerType::External) {
            let state = self.state::<crate::SharedState>();
            let key = {
                let guard = state.lock().await;
                guard.am_api_key.clone()
            };
            let key = key
                .filter(|k| !k.is_empty())
                .ok_or(crate::Error::AmApiKeyNotSet)?;
            Some(key)
        } else {
            None
        };

        let cache_dir = self.models_dir();
        let data_dir = self.app_handle().path().app_data_dir().unwrap().join("stt");

        self.stop_server(None).await?;
        // Need some delay
        sleep(Duration::from_millis(300)).await;

        match t {
            ServerType::Internal => {
                let whisper_model = match model {
                    SupportedSttModel::Whisper(m) => m,
                    _ => {
                        return Err(crate::Error::UnsupportedModelType);
                    }
                };

                let (_server, _) = Actor::spawn(
                    Some(internal::InternalSTTActor::name()),
                    internal::InternalSTTActor,
                    internal::InternalSTTArgs {
                        model_cache_dir: cache_dir,
                        model_type: whisper_model,
                    },
                )
                .await
                .map_err(|e| crate::Error::ServerStartFailed(e.to_string()))?;

                internal_health()
                    .await
                    .and_then(|info| info.url)
                    .ok_or_else(|| crate::Error::ServerStartFailed("empty_health".to_string()))
            }
            ServerType::External => {
                let am_model = match model {
                    SupportedSttModel::Am(m) => m,
                    _ => {
                        return Err(crate::Error::UnsupportedModelType);
                    }
                };

                let am_key = match am_key {
                    Some(key) => key,
                    None => {
                        return Err(crate::Error::AmApiKeyNotSet);
                    }
                };

                let cmd: tauri_plugin_shell::process::Command = {
                    #[cfg(debug_assertions)]
                    {
                        let passthrough_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                            .join("../../apps/desktop/src-tauri/resources/passthrough-aarch64-apple-darwin");
                        let stt_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(
                            "../../apps/desktop/src-tauri/resources/stt-aarch64-apple-darwin",
                        );

                        if !passthrough_path.exists() || !stt_path.exists() {
                            return Err(crate::Error::AmBinaryNotFound);
                        }

                        self.shell()
                            .command(passthrough_path)
                            .current_dir(dirs::home_dir().unwrap())
                            .arg(stt_path)
                            .args(["serve", "--any-token", "-v", "-d"])
                    }

                    #[cfg(not(debug_assertions))]
                    self.shell()
                        .sidecar("stt")?
                        .current_dir(dirs::home_dir().unwrap())
                        .args(["serve", "--any-token"])
                };

                let (_server, _) = Actor::spawn(
                    Some(external::ExternalSTTActor::name()),
                    external::ExternalSTTActor,
                    external::ExternalSTTArgs {
                        cmd,
                        api_key: am_key,
                        model: am_model,
                        models_dir: data_dir,
                    },
                )
                .await
                .map_err(|e| crate::Error::ServerStartFailed(e.to_string()))?;

                external_health()
                    .await
                    .and_then(|info| info.url)
                    .ok_or_else(|| crate::Error::ServerStartFailed("empty_health".to_string()))
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn stop_server(&self, server_type: Option<ServerType>) -> Result<bool, crate::Error> {
        let mut stopped = false;
        match server_type {
            Some(ServerType::External) => {
                if let Some(cell) = registry::where_is(external::ExternalSTTActor::name()) {
                    let actor: ActorRef<external::ExternalSTTMessage> = cell.into();
                    if let Err(e) = actor.stop_and_wait(None, None).await {
                        tracing::error!("stop_server: {:?}", e);
                    } else {
                        stopped = true;
                    }
                }
            }
            Some(ServerType::Internal) => {
                if let Some(cell) = registry::where_is(internal::InternalSTTActor::name()) {
                    let actor: ActorRef<internal::InternalSTTMessage> = cell.into();
                    if let Err(e) = actor.stop_and_wait(None, None).await {
                        tracing::error!("stop_server: {:?}", e);
                    } else {
                        stopped = true;
                    }
                }
            }
            None => {
                if let Some(cell) = registry::where_is(external::ExternalSTTActor::name()) {
                    let actor: ActorRef<external::ExternalSTTMessage> = cell.into();
                    if let Err(e) = actor.stop_and_wait(None, None).await {
                        tracing::error!("stop_server: {:?}", e);
                    } else {
                        stopped = true;
                    }
                }
                if let Some(cell) = registry::where_is(internal::InternalSTTActor::name()) {
                    let actor: ActorRef<internal::InternalSTTMessage> = cell.into();
                    if let Err(e) = actor.stop_and_wait(None, None).await {
                        tracing::error!("stop_server: {:?}", e);
                    } else {
                        stopped = true;
                    }
                }
            }
        }

        Ok(stopped)
    }

    #[tracing::instrument(skip_all)]
    async fn get_servers(&self) -> Result<HashMap<ServerType, ServerInfo>, crate::Error> {
        let internal_info = internal_health().await.unwrap_or_else(|| ServerInfo {
            url: None,
            status: ServerStatus::Unreachable,
            model: None,
        });

        let external_info = external_health().await.unwrap_or_else(|| ServerInfo {
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
