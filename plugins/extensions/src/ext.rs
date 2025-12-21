use std::path::PathBuf;

use crate::ManagedState;

pub struct Extensions<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Extensions<'a, R, M> {
    pub async fn load_extension(&self, path: PathBuf) -> Result<(), crate::Error> {
        let extension = hypr_extensions_runtime::Extension::load(path)?;

        let runtime = {
            let state = self.manager.state::<ManagedState>();
            let guard = state.lock().await;
            guard.runtime.clone()
        };

        runtime.load_extension(extension).await?;
        Ok(())
    }

    pub async fn call_function(
        &self,
        extension_id: String,
        function_name: String,
        args_json: String,
    ) -> Result<String, crate::Error> {
        let args: Vec<serde_json::Value> = serde_json::from_str(&args_json)
            .map_err(|e| crate::Error::RuntimeError(e.to_string()))?;

        let runtime = {
            let state = self.manager.state::<ManagedState>();
            let guard = state.lock().await;
            guard.runtime.clone()
        };

        let result = runtime
            .call_function(&extension_id, &function_name, args)
            .await?;

        serde_json::to_string(&result).map_err(|e| crate::Error::RuntimeError(e.to_string()))
    }

    pub async fn execute_code(
        &self,
        extension_id: String,
        code: String,
    ) -> Result<String, crate::Error> {
        let runtime = {
            let state = self.manager.state::<ManagedState>();
            let guard = state.lock().await;
            guard.runtime.clone()
        };

        let result = runtime.execute_code(&extension_id, &code).await?;

        serde_json::to_string(&result).map_err(|e| crate::Error::RuntimeError(e.to_string()))
    }
}

pub trait ExtensionsPluginExt<R: tauri::Runtime> {
    fn extensions(&self) -> Extensions<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ExtensionsPluginExt<R> for T {
    fn extensions(&self) -> Extensions<'_, R, Self>
    where
        Self: Sized,
    {
        Extensions {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
