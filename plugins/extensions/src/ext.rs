use std::path::PathBuf;

use tauri::{Manager, Runtime};

use crate::ManagedState;

pub trait ExtensionsPluginExt<R: Runtime> {
    fn load_extension(
        &self,
        path: PathBuf,
    ) -> impl std::future::Future<Output = Result<(), crate::Error>>;

    fn call_function(
        &self,
        extension_id: String,
        function_name: String,
        args_json: String,
    ) -> impl std::future::Future<Output = Result<String, crate::Error>>;

    fn execute_code(
        &self,
        extension_id: String,
        code: String,
    ) -> impl std::future::Future<Output = Result<String, crate::Error>>;
}

impl<R: Runtime, T: Manager<R>> ExtensionsPluginExt<R> for T {
    async fn load_extension(&self, path: PathBuf) -> Result<(), crate::Error> {
        let extension = hypr_extensions_runtime::Extension::load(path)?;

        let runtime = {
            let state = self.state::<ManagedState>();
            let guard = state.lock().await;
            guard.runtime.clone()
        };

        runtime.load_extension(extension).await?;
        Ok(())
    }

    async fn call_function(
        &self,
        extension_id: String,
        function_name: String,
        args_json: String,
    ) -> Result<String, crate::Error> {
        let args: Vec<serde_json::Value> = serde_json::from_str(&args_json)
            .map_err(|e| crate::Error::RuntimeError(e.to_string()))?;

        let runtime = {
            let state = self.state::<ManagedState>();
            let guard = state.lock().await;
            guard.runtime.clone()
        };

        let result = runtime
            .call_function(&extension_id, &function_name, args)
            .await?;

        serde_json::to_string(&result).map_err(|e| crate::Error::RuntimeError(e.to_string()))
    }

    async fn execute_code(
        &self,
        extension_id: String,
        code: String,
    ) -> Result<String, crate::Error> {
        let runtime = {
            let state = self.state::<ManagedState>();
            let guard = state.lock().await;
            guard.runtime.clone()
        };

        let result = runtime.execute_code(&extension_id, &code).await?;

        serde_json::to_string(&result).map_err(|e| crate::Error::RuntimeError(e.to_string()))
    }
}
