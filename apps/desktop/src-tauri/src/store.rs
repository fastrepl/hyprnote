// https://github.com/CapSoftware/Cap/blob/8671050aaff780f658507579e7d1d75e7ee25d59/apps/desktop/src-tauri/src/auth.rs

use serde::{Deserialize, Serialize};
use specta::Type;

use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

#[derive(Debug, Default, Serialize, Deserialize, Type)]
pub struct UserStore {
    pub user_id: Option<String>,
}

impl UserStore {
    pub fn load<R: Runtime>(app: &AppHandle<R>) -> Result<Self, String> {
        let Some(store) = app
            .store("store")
            .map(|s| s.get("auth"))
            .map_err(|e| e.to_string())?
        else {
            return Ok(Self::default());
        };

        serde_json::from_value(store).map_err(|e| e.to_string())
    }

    pub fn get<R: Runtime>(app: &AppHandle<R>) -> Result<Self, String> {
        let Some(Some(store)) = app.get_store("store").map(|s| s.get("auth")) else {
            return Ok(Self::default());
        };

        serde_json::from_value(store).map_err(|e| e.to_string())
    }

    pub fn set<R: Runtime>(app: &AppHandle<R>, v: Self) -> Result<(), String> {
        let new_auth = Self { user_id: v.user_id };

        app.store("store")
            .map(|s| s.set("auth", serde_json::to_value(new_auth).unwrap()))
            .map_err(|e| e.to_string())
    }
}
