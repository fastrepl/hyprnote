use std::path::PathBuf;

use crate::GitPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn init<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    path: PathBuf,
) -> Result<(), String> {
    app.git().init(&path).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn add<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    path: PathBuf,
    patterns: Vec<String>,
) -> Result<(), String> {
    app.git().add(&path, patterns).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn commit<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    path: PathBuf,
    message: String,
) -> Result<String, String> {
    app.git().commit(&path, &message).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn status<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    path: PathBuf,
) -> Result<Vec<String>, String> {
    app.git().status(&path).map_err(|e| e.to_string())
}
