use crate::{store::AuthStoreKey, vault::VaultKey, AuthEvent, AuthPluginExt};

#[tauri::command]
#[specta::specta]
pub fn start_oauth_server<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    channel: tauri::ipc::Channel<AuthEvent>,
) -> Result<u16, String> {
    app.start_oauth_server(channel)
}

#[tauri::command]
#[specta::specta]
pub fn stop_oauth_server<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    port: u16,
) -> Result<(), String> {
    app.stop_oauth_server(port)
}

#[tauri::command]
#[specta::specta]
pub fn reset_vault<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.reset_vault()
}

#[tauri::command]
#[specta::specta]
pub fn get_from_vault<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    key: VaultKey,
) -> Result<Option<String>, String> {
    app.get_from_vault(key)
}

#[tauri::command]
#[specta::specta]
pub fn get_from_store<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    key: AuthStoreKey,
) -> Result<Option<String>, String> {
    app.get_from_store(key)
}
