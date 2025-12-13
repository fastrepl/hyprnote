use tauri::Manager;

#[tauri::command]
#[specta::specta]
pub(crate) fn path<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> String {
    let state = app.state::<crate::state::SettingsState>();
    state.path().to_string_lossy().to_string()
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn load<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<serde_json::Value, String> {
    let state = app.state::<crate::state::SettingsState>();
    state.load().await
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn save<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    settings: serde_json::Value,
) -> Result<(), String> {
    let state = app.state::<crate::state::SettingsState>();
    state.save(settings).await
}
