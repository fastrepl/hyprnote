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

    pub fn set<R: Runtime>(app: &AppHandle<R>, auth: Self) -> Result<(), String> {
        app.store("store")
            .map(|s| s.set("auth", serde_json::to_value(auth).unwrap()))
            .map_err(|e| e.to_string())
    }
}

pub mod commands {
    use crate::auth::AuthStore;

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip_all)]
    pub async fn start_oauth_server(app: tauri::AppHandle) -> Result<u16, String> {
        let port = tauri_plugin_oauth::start_with_config(
            tauri_plugin_oauth::OauthConfig {
                ports: None,
                response: Some(
                    r#"
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hyprnote</title>
        <script src="https://cdn.twind.style" crossorigin></script>
    </head>
    <body class="bg-gray-100 flex items-center justify-center min-h-screen">
        <div class="bg-white p-8 rounded-lg shadow-lg text-center">
            <h1 class="text-2xl font-bold text-gray-800 mb-4">Authentication Successful</h1>
            <p class="text-gray-600">Please go back to the app.</p>
        </div>
    </body>
</html>"#
                        .trim()
                        .into(),
                ),
            },
            move |url| {
                tracing::info!("oauth_callback: {}", url);
                AuthStore::set(
                    &app,
                    AuthStore {
                        token: url.to_string(),
                    },
                )
                .unwrap();
            },
        )
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
