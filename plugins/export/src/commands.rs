use crate::ExportPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_tiptap_json_to_md<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    json: String,
    path: String,
) -> Result<(), String> {
    let json_value: serde_json::Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    app.export()
        .export_tiptap_json_to_md(json_value, path)
        .await
        .map_err(|e| e.to_string())
}
