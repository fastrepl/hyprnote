use crate::MembershipPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn refresh<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.refresh().map_err(|e| e.to_string())
}
