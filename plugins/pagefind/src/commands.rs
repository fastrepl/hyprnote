use crate::PagefindPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn search<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    query: String,
) -> Result<Vec<String>, String> {
    app.pagefind()
        .search(query)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn index<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    content: String,
) -> Result<(), String> {
    app.pagefind()
        .index(content)
        .await
        .map_err(|e| e.to_string())
}
