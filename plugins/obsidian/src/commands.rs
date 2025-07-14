use crate::ObsidianPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_api_key().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    api_key: String,
) -> Result<(), String> {
    app.set_api_key(api_key).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_base_url<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_base_url().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_base_url<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    base_url: String,
) -> Result<(), String> {
    app.set_base_url(base_url).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_vault_name<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_vault_name().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_vault_name<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    vault_name: String,
) -> Result<(), String> {
    app.set_vault_name(vault_name).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_base_folder<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_base_folder().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_base_folder<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    base_folder: String,
) -> Result<(), String> {
    app.set_base_folder(base_folder).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_enabled(enabled).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_deep_link_url<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    note_name: String,
) -> Result<String, String> {
    app.get_deep_link_url(note_name).map_err(|e| e.to_string())
}
