use std::path::PathBuf;

use crate::{ObsidianVault, SettingsPluginExt};

#[tauri::command]
#[specta::specta]
pub(crate) async fn settings_base<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    app.settings()
        .settings_base()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn content_base<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    app.settings()
        .content_base()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn change_content_base<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    new_path: String,
) -> Result<(), String> {
    let current_base = app.settings().content_base().map_err(|e| e.to_string())?;

    let new_path_buf = PathBuf::from(&new_path);
    if new_path_buf == current_base {
        return Ok(());
    }

    app.settings()
        .change_content_base(new_path_buf)
        .await
        .map_err(|e| e.to_string())?;

    app.restart();
}

#[tauri::command]
#[specta::specta]
pub(crate) fn obsidian_vaults<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<ObsidianVault>, String> {
    app.settings().obsidian_vaults().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn path<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    app.settings()
        .path()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn load<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<serde_json::Value, String> {
    app.settings().load().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn save<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    settings: serde_json::Value,
) -> Result<(), String> {
    app.settings()
        .save(settings)
        .await
        .map_err(|e| e.to_string())
}
