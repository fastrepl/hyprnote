use crate::ext::AppExt;

#[tauri::command]
#[specta::specta]
pub async fn setup_db<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.setup_db().await
}
