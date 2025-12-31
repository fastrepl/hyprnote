//! For many small files with frequent writes, sync I/O with rayon parallelism
//! is more efficient than async I/O (avoids per-file async task overhead).
//! `spawn_blocking` wraps the sync work to prevent blocking Tauri's invoke handler.

use rayon::prelude::*;

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_tiptap_json_to_md(
    json: serde_json::Value,
    path: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let md = crate::tiptap_json_to_md(&json).map_err(|e| e.to_string())?;
        std::fs::write(path, md).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_tiptap_json_to_md_batch(
    items: Vec<(serde_json::Value, String)>,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        items.into_par_iter().try_for_each(|(json, path)| {
            let md = crate::tiptap_json_to_md(&json).map_err(|e| e.to_string())?;
            std::fs::write(path, md).map_err(|e| e.to_string())
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
