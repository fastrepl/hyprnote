use std::path::PathBuf;

use crate::{Error, ExtensionsPluginExt};

#[tauri::command]
#[specta::specta]
pub async fn load_extension<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    path: String,
) -> Result<(), Error> {
    app.load_extension(PathBuf::from(path)).await
}

#[tauri::command]
#[specta::specta]
pub async fn call_function<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    extension_id: String,
    function_name: String,
    args_json: String,
) -> Result<String, Error> {
    app.call_function(extension_id, function_name, args_json)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn execute_code<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    extension_id: String,
    code: String,
) -> Result<String, Error> {
    app.execute_code(extension_id, code).await
}

#[tauri::command]
#[specta::specta]
pub async fn list_extensions<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<Vec<String>, Error> {
    Ok(vec![])
}
