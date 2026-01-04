use crate::FrontmatterPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn deserialize<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    input: String,
) -> Result<crate::ParsedDocument, String> {
    app.frontmatter()
        .deserialize(input)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn serialize<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    doc: crate::ParsedDocument,
) -> Result<String, String> {
    app.frontmatter().serialize(doc).map_err(|e| e.to_string())
}
