// https://github.com/CapSoftware/Cap/blob/8671050aaff780f658507579e7d1d75e7ee25d59/apps/desktop/src-tauri/src/auth.rs

use serde::{Deserialize, Serialize};
use specta::Type;

use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct AuthStore {
    pub token: String,
}

impl AuthStore {
    pub fn load<R: Runtime>(app: &AppHandle<R>) -> Result<Option<Self>, String> {
        let Some(store) = app
            .store("store")
            .map(|s| s.get("auth"))
            .map_err(|e| e.to_string())?
        else {
            return Ok(None);
        };

        serde_json::from_value(store).map_err(|e| e.to_string())
    }

    pub fn get<R: Runtime>(app: &AppHandle<R>) -> Result<Option<Self>, String> {
        let Some(Some(store)) = app.get_store("store").map(|s| s.get("auth")) else {
            return Ok(None);
        };

        serde_json::from_value(store).map_err(|e| e.to_string())
    }
}

pub mod commands {
    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip_all)]
    pub async fn start_oauth_server(_window: tauri::Window) -> Result<u16, String> {
        let port = tauri_plugin_oauth::start(move |url| {
            tracing::info!("Redirect URI: {}", url);
        })
        .map_err(|err| err.to_string())?;

        Ok(port)
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip_all)]
    pub async fn cancel_oauth_server(port: u16) -> Result<(), String> {
        tauri_plugin_oauth::cancel(port).map_err(|err| err.to_string())
    }
}
