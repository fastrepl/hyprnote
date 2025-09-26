use std::{collections::HashMap, future::Future, path::PathBuf};

use ractor::{call_t, registry, Actor, ActorRef};
use tokio_util::sync::CancellationToken;

use tauri::{ipc::Channel, Manager, Runtime};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_store2::StorePluginExt;

use hypr_download_interface::DownloadProgress;
use hypr_file::download_file_parallel_cancellable;
use hypr_whisper_local_model::WhisperModel;

use crate::{
    model::SupportedSttModel,
    server::{external, internal, ServerHealth, ServerType},
    Connection, Provider, StoreKey,
};

pub trait LocalSttPluginExt<R: Runtime> {
    fn local_stt_store(&self) -> tauri_plugin_store2::ScopedStore<R, StoreKey>;

    fn models_dir(&self) -> PathBuf;
    fn list_ggml_backends(&self) -> Vec<hypr_whisper_local::GgmlBackend>;

    fn get_custom_base_url(&self) -> Result<String, crate::Error>;
    fn set_custom_base_url(&self, base_url: impl Into<String>) -> Result<(), crate::Error>;
    fn get_custom_api_key(&self) -> Result<Option<String>, crate::Error>;
    fn set_custom_api_key(&self, api_key: impl Into<String>) -> Result<(), crate::Error>;
    fn get_provider(&self) -> Result<Provider, crate::Error>;
    fn set_provider(&self, provider: Provider) -> impl Future<Output = Result<(), crate::Error>>;

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
    ) -> impl Future<Output = Result<HashMap<ServerType, ServerHealth>, crate::Error>>;

    fn get_local_model(&self) -> Result<SupportedSttModel, crate::Error>;
    fn set_local_model(
        &self,
        model: SupportedSttModel,
    ) -> impl Future<Output = Result<(), crate::Error>>;

    fn get_custom_model(&self) -> Result<Option<SupportedSttModel>, crate::Error>;
    fn set_custom_model(&self, model: SupportedSttModel) -> Result<(), crate::Error>;

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
    fn local_stt_store(&self) -> tauri_plugin_store2::ScopedStore<R, StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn models_dir(&self) -> PathBuf {
        self.path().app_data_dir().unwrap().join("stt")
    }

    fn list_ggml_backends(&self) -> Vec<hypr_whisper_local::GgmlBackend> {
        hypr_whisper_local::list_ggml_backends()
    }

    fn get_custom_base_url(&self) -> Result<String, crate::Error> {
        let store = self.local_stt_store();
        let v = store.get(StoreKey::CustomBaseUrl)?;
        Ok(v.unwrap_or_default())
    }

    fn get_custom_api_key(&self) -> Result<Option<String>, crate::Error> {
        let store = self.local_stt_store();
        let v = store.get(StoreKey::CustomApiKey)?;
        Ok(v)
    }

    fn get_provider(&self) -> Result<Provider, crate::Error> {
        let store = self.local_stt_store();
        let v = store.get(StoreKey::Provider)?;
        Ok(v.unwrap_or(Provider::Local))
    }

    fn set_custom_base_url(&self, base_url: impl Into<String>) -> Result<(), crate::Error> {
        let store = self.local_stt_store();
        store.set(StoreKey::CustomBaseUrl, base_url.into())?;
        Ok(())
    }

    fn set_custom_api_key(&self, api_key: impl Into<String>) -> Result<(), crate::Error> {
        let store = self.local_stt_store();
        store.set(StoreKey::CustomApiKey, api_key.into())?;
        Ok(())
    }

    async fn set_provider(&self, provider: Provider) -> Result<(), crate::Error> {
        let store = self.local_stt_store();
        store.set(StoreKey::Provider, &provider)?;

        if matches!(provider, Provider::Local) {
            let local_model = self.get_local_model()?;
            self.start_server(Some(local_model)).await?;
        }

        Ok(())
    }

    async fn get_connection(&self) -> Result<Connection, crate::Error> {
        let provider = self.get_provider()?;

        match provider {
            Provider::Custom => {
                let model = self.get_custom_model()?;
                let base_url = self.get_custom_base_url()?;
                let api_key = self.get_custom_api_key()?;
                Ok(Connection {
                    model: model.map(|m| m.to_string()),
                    base_url,
                    api_key,
                })
            }
            Provider::Local => {
                let model = self.get_local_model()?;

                match model {
                    SupportedSttModel::Custom(_) => {
                        let base_url = self.get_custom_base_url()?;
                        let api_key = self.get_custom_api_key()?;
                        Ok(Connection {
                            model: None,
                            base_url,
                            api_key,
                        })
                    }
                    SupportedSttModel::Am(_) => {
                        let existing_api_base = external_health().await.map(|r| r.0);

                        let am_key = {
                            let state = self.state::<crate::SharedState>();
                            let key = state.lock().await.am_api_key.clone();
                            key.clone().ok_or(crate::Error::AmApiKeyNotSet)?
                        };

                        let conn = match existing_api_base {
                            Some(api_base) => Connection {
                                model: None,
                                base_url: api_base,
                                api_key: Some(am_key),
                            },
                            None => {
                                let api_base = self.start_server(Some(model)).await?;
                                Connection {
                                    model: None,
                                    base_url: api_base,
                                    api_key: Some(am_key),
                                }
                            }
                        };
                        Ok(conn)
                    }
                    SupportedSttModel::Whisper(_) => {
                        let existing_api_base = internal_health().await.map(|r| r.0);

                        let conn = match existing_api_base {
                            Some(api_base) => Connection {
                                model: None,
                                base_url: api_base,
                                api_key: None,
                            },
                            None => {
                                let api_base = self.start_server(Some(model)).await?;
                                Connection {
                                    model: None,
                                    base_url: api_base,
                                    api_key: None,
                                }
                            }
                        };
                        Ok(conn)
                    }
                }
            }
        }
    }

    async fn is_model_downloaded(&self, model: &SupportedSttModel) -> Result<bool, crate::Error> {
        match model {
            SupportedSttModel::Custom(_) => Ok(false),
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
        let provider = self.get_provider()?;

        if matches!(provider, Provider::Custom) {
            return self.get_custom_base_url();
        }

        let model = match model {
            Some(m) => m,
            None => self.get_local_model()?,
        };

        let t = match &model {
            SupportedSttModel::Custom(_) => {
                return Err(crate::Error::UnsupportedModelType);
            }
            SupportedSttModel::Am(_) => ServerType::External,
            SupportedSttModel::Whisper(_) => ServerType::Internal,
        };

        let cache_dir = self.models_dir();
        let data_dir = self.app_handle().path().app_data_dir().unwrap().join("stt");

        match t {
            ServerType::Custom => Ok("".to_string()),
            ServerType::Internal => {
                if !self.is_model_downloaded(&model).await? {
                    return Err(crate::Error::ModelNotDownloaded);
                }

                if registry::where_is(internal::InternalSTTActor::name()).is_some() {
                    return Err(crate::Error::ServerAlreadyRunning);
                }

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
                .map_err(|_| crate::Error::ServerStartFailed)?;

                let base_url = internal_health().await.map(|r| r.0).unwrap();
                Ok(base_url)
            }
            ServerType::External => {
                if registry::where_is(external::ExternalSTTActor::name()).is_some() {
                    return Err(crate::Error::ServerAlreadyRunning);
                }

                let am_model = match model {
                    SupportedSttModel::Am(m) => m,
                    _ => {
                        return Err(crate::Error::UnsupportedModelType);
                    }
                };

                let am_key = {
                    let state = self.state::<crate::SharedState>();

                    let key = state.lock().await.am_api_key.clone();
                    if key.clone().is_none() || key.clone().unwrap().is_empty() {
                        return Err(crate::Error::AmApiKeyNotSet);
                    }

                    key.clone().unwrap()
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
                            .args(["serve", "-v", "-d"])
                    }

                    #[cfg(not(debug_assertions))]
                    self.shell()
                        .sidecar("stt")?
                        .current_dir(dirs::home_dir().unwrap())
                        .args(["serve"])
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
                .map_err(|_| crate::Error::ServerStartFailed)?;

                let base_url = external_health().await.map(|v| v.0).unwrap();
                Ok(base_url)
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn stop_server(&self, server_type: Option<ServerType>) -> Result<bool, crate::Error> {
        let provider = self.get_provider()?;

        if matches!(provider, Provider::Custom) {
            return Ok(false);
        }

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
            Some(ServerType::Custom) => {}
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
    async fn get_servers(&self) -> Result<HashMap<ServerType, ServerHealth>, crate::Error> {
        let internal_health = internal_health()
            .await
            .map(|r| r.1)
            .unwrap_or(ServerHealth::Unreachable);

        let external_health = external_health()
            .await
            .map(|r| r.1)
            .unwrap_or(ServerHealth::Unreachable);

        let custom_health = {
            let provider = self.get_provider()?;
            if matches!(provider, Provider::Custom) {
                let base_url = self.get_custom_base_url()?;
                if !base_url.is_empty() {
                    let client = reqwest::Client::new();
                    let url = format!("{}/v1/status", base_url.trim_end_matches('/'));

                    match client.get(&url).send().await {
                        Ok(response) if response.status().as_u16() == 204 => ServerHealth::Ready,
                        _ => ServerHealth::Unreachable,
                    }
                } else {
                    ServerHealth::Unreachable
                }
            } else {
                ServerHealth::Unreachable
            }
        };

        Ok([
            (ServerType::Internal, internal_health),
            (ServerType::External, external_health),
            (ServerType::Custom, custom_health),
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
        let provider = self.get_provider()?;

        if matches!(provider, Provider::Custom) {
            return Err(crate::Error::UnsupportedModelType);
        }

        if let SupportedSttModel::Custom(_) = model {
            return Err(crate::Error::UnsupportedModelType);
        }

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
            SupportedSttModel::Custom(_) => {
                return Err(crate::Error::UnsupportedModelType);
            }
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
        let provider = self.get_provider().unwrap_or(Provider::Local);

        if matches!(provider, Provider::Custom) {
            return false;
        }

        let state = self.state::<crate::SharedState>();
        {
            let guard = state.lock().await;
            guard.download_task.contains_key(model)
        }
    }

    #[tracing::instrument(skip_all)]
    fn get_local_model(&self) -> Result<SupportedSttModel, crate::Error> {
        let store = self.local_stt_store();
        let model = store.get(crate::StoreKey::LocalModel)?;
        Ok(model.unwrap_or(SupportedSttModel::Whisper(WhisperModel::QuantizedSmall)))
    }

    #[tracing::instrument(skip_all)]
    async fn set_local_model(&self, model: SupportedSttModel) -> Result<(), crate::Error> {
        let store = self.local_stt_store();
        store.set(crate::StoreKey::LocalModel, model.clone())?;

        let provider = self.get_provider()?;

        if matches!(provider, Provider::Local) {
            self.stop_server(None).await?;
            self.start_server(Some(model)).await?;
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    fn get_custom_model(&self) -> Result<Option<SupportedSttModel>, crate::Error> {
        let store = self.local_stt_store();
        let model = store.get(crate::StoreKey::CustomModel)?;
        Ok(model)
    }

    #[tracing::instrument(skip_all)]
    fn set_custom_model(&self, model: SupportedSttModel) -> Result<(), crate::Error> {
        let store = self.local_stt_store();
        store.set(crate::StoreKey::CustomModel, model)?;
        Ok(())
    }
}

async fn internal_health() -> Option<(String, ServerHealth)> {
    match registry::where_is(internal::InternalSTTActor::name()) {
        Some(cell) => {
            let actor: ActorRef<internal::InternalSTTMessage> = cell.into();
            match call_t!(actor, internal::InternalSTTMessage::GetHealth, 10 * 1000) {
                Ok(r) => Some(r),
                Err(_) => None,
            }
        }
        None => None,
    }
}

async fn external_health() -> Option<(String, ServerHealth)> {
    match registry::where_is(external::ExternalSTTActor::name()) {
        Some(cell) => {
            let actor: ActorRef<external::ExternalSTTMessage> = cell.into();
            match call_t!(actor, external::ExternalSTTMessage::GetHealth, 10 * 1000) {
                Ok(r) => Some(r),
                Err(_) => None,
            }
        }
        None => None,
    }
}
