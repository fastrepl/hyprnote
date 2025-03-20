use std::future::Future;
use tauri::{Manager, Runtime};

#[derive(serde::Serialize, specta::Type)]
pub struct Status {
    pub model_loaded: bool,
    pub server_running: bool,
}

pub trait LocalSttPluginExt<R: Runtime> {
    fn get_status(&self) -> impl Future<Output = Status>;
    fn start_server(&self) -> impl Future<Output = Result<(), String>>;
    fn stop_server(&self) -> impl Future<Output = Result<(), String>>;
}

impl<R: Runtime, T: Manager<R>> LocalSttPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn get_status(&self) -> Status {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;

        Status {
            model_loaded: s.model.is_some(),
            server_running: s.server.is_some(),
        }
    }

    #[tracing::instrument(skip_all)]
    async fn start_server(&self) -> Result<(), String> {
        let state = self.state::<crate::SharedState>();
        let data_dir = self.path().app_data_dir().unwrap();

        let server = crate::server::run_server(crate::server::ServerState {
            cache_dir: data_dir,
            model_type: rwhisper::WhisperSource::QuantizedDistilLargeV3,
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
}
