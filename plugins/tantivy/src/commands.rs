use crate::{SearchDocument, SearchFilters, SearchResult, TantivyPluginExt};

#[tauri::command]
#[specta::specta]
pub(crate) async fn ping<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.tantivy().ping().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn init<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.tantivy().init().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn add_document<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    doc: SearchDocument,
) -> Result<(), String> {
    app.tantivy()
        .add_document(doc)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn update_document<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    doc: SearchDocument,
) -> Result<(), String> {
    app.tantivy()
        .update_document(doc)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_document<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    id: String,
) -> Result<(), String> {
    app.tantivy()
        .delete_document(id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn commit<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.tantivy().commit().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn search<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    query: String,
    filters: Option<SearchFilters>,
    limit: Option<usize>,
) -> Result<SearchResult, String> {
    app.tantivy()
        .search(query, filters, limit.unwrap_or(100))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn search_fuzzy<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    query: String,
    filters: Option<SearchFilters>,
    limit: Option<usize>,
    distance: Option<u8>,
) -> Result<SearchResult, String> {
    app.tantivy()
        .search_fuzzy(query, filters, limit.unwrap_or(100), distance.unwrap_or(1))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn clear<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.tantivy().clear().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn count<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<u64, String> {
    app.tantivy().count().await.map_err(|e| e.to_string())
}
