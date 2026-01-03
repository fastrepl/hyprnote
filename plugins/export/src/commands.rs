use rayon::prelude::*;
use serde_json::Value;

/// For many small files with frequent writes, sync I/O with rayon parallelism
/// is more efficient than async I/O (avoids per-file async task overhead).
/// This macro wraps sync work to prevent blocking Tauri's invoke handler.
macro_rules! spawn_blocking {
    ($body:expr) => {
        tokio::task::spawn_blocking(move || $body)
            .await
            .map_err(|e| e.to_string())?
    };
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_json(json: Value, path: String) -> Result<(), String> {
    spawn_blocking!({
        let content = crate::json::serialize(json)?;
        std::fs::write(path, content).map_err(|e| e.to_string())
    })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_json_batch(items: Vec<(Value, String)>) -> Result<(), String> {
    spawn_blocking!({
        items.into_par_iter().try_for_each(|(json, path)| {
            let content = crate::json::serialize(json)?;
            std::fs::write(path, content).map_err(|e| e.to_string())
        })
    })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_tiptap_json_to_md(
    json: serde_json::Value,
    path: String,
) -> Result<(), String> {
    spawn_blocking!({
        let md = crate::tiptap_json_to_md(&json).map_err(|e| e.to_string())?;
        std::fs::write(path, md).map_err(|e| e.to_string())
    })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_tiptap_json_to_md_batch(
    items: Vec<(serde_json::Value, String)>,
) -> Result<(), String> {
    spawn_blocking!({
        items.into_par_iter().try_for_each(|(json, path)| {
            let md = crate::tiptap_json_to_md(&json).map_err(|e| e.to_string())?;
            std::fs::write(path, md).map_err(|e| e.to_string())
        })
    })
}
