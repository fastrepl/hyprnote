use crate::{SearchFilters, SearchOptions, SearchResult, TantivyPluginExt};

#[tauri::command]
#[specta::specta]
pub(crate) async fn search<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    query: String,
    filters: Option<SearchFilters>,
    limit: Option<usize>,
    collection: Option<String>,
    options: Option<SearchOptions>,
) -> Result<SearchResult, String> {
    app.tantivy()
        .search(collection, query, filters, limit.unwrap_or(100), options)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn reindex<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    collection: Option<String>,
) -> Result<(), String> {
    app.tantivy()
        .reindex(collection)
        .await
        .map_err(|e| e.to_string())
}
