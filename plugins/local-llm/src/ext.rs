use std::future::Future;
use std::path::PathBuf;

use tauri::{Manager, Runtime};

#[derive(serde::Serialize, specta::Type)]
pub struct Status {
    pub model_loaded: bool,
    pub server_running: bool,
}

pub trait LocalLlmPluginExt<R: Runtime> {
    fn api_base(&self) -> impl Future<Output = Option<String>>;
    fn get_status(&self) -> impl Future<Output = Status>;
    fn load_model(&self, p: impl Into<PathBuf>) -> impl Future<Output = Result<(), crate::Error>>;
    fn unload_model(&self) -> impl Future<Output = Result<(), String>>;
    fn start_server(&self) -> impl Future<Output = Result<(), String>>;
    fn stop_server(&self) -> impl Future<Output = Result<(), String>>;
}

impl<R: Runtime, T: Manager<R>> LocalLlmPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn api_base(&self) -> Option<String> {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;
        s.api_base.clone()
    }

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
    async fn load_model(&self, model_path: impl Into<PathBuf>) -> Result<(), crate::Error> {
        let state = self.state::<crate::SharedState>();

        {
            let s = state.lock().await;
            if s.model.is_some() {
                return Ok(());
            }
        }

        let model = hypr_llama::Llama::new(model_path)?;

        {
            let mut s = state.lock().await;
            s.model = Some(model);
        }
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn unload_model(&self) -> Result<(), String> {
        let state = self.state::<crate::SharedState>();

        {
            let mut s = state.lock().await;
            s.model.take();
        }
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn start_server(&self) -> Result<(), String> {
        let state = self.state::<crate::SharedState>();
        let server = crate::server::run_server(state.inner().clone())
            .await
            .map_err(|e| e.to_string())?;

        let mut s = state.lock().await;
        s.api_base = Some(format!("http://{}", &server.addr));
        s.server = Some(server);
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
