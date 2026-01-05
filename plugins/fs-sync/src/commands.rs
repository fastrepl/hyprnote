use rayon::prelude::*;
use serde_json::Value;

use crate::FsSyncPluginExt;
use crate::frontmatter::ParsedDocument;
use crate::types::ListFoldersResult;

#[tauri::command]
#[specta::specta]
pub(crate) async fn deserialize(input: String) -> Result<ParsedDocument, String> {
    crate::frontmatter::deserialize(&input).map_err(|e| e.to_string())
}

macro_rules! spawn_blocking {
    ($body:expr) => {
        tokio::task::spawn_blocking(move || $body)
            .await
            .map_err(|e| e.to_string())?
    };
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn write_json_batch(items: Vec<(Value, String)>) -> Result<(), String> {
    spawn_blocking!({
        items.into_par_iter().try_for_each(|(json, path)| {
            let content = crate::json::serialize(json)?;
            std::fs::write(path, content).map_err(|e| e.to_string())
        })
    })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn write_markdown_batch(
    items: Vec<(serde_json::Value, String)>,
) -> Result<(), String> {
    spawn_blocking!({
        items.into_par_iter().try_for_each(|(json, path)| {
            let md = hypr_tiptap::tiptap_json_to_md(&json).map_err(|e| e.to_string())?;
            std::fs::write(path, md).map_err(|e| e.to_string())
        })
    })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn write_frontmatter_batch(
    items: Vec<(ParsedDocument, String)>,
) -> Result<(), String> {
    spawn_blocking!({
        items.into_par_iter().try_for_each(|(doc, path)| {
            let content = crate::frontmatter::serialize(doc).map_err(|e| e.to_string())?;
            std::fs::write(path, content).map_err(|e| e.to_string())
        })
    })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_folders<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<ListFoldersResult, String> {
    app.fs_sync().list_folders().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn move_session<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    target_folder_path: String,
) -> Result<(), String> {
    app.fs_sync()
        .move_session(&session_id, &target_folder_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn create_folder<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    folder_path: String,
) -> Result<(), String> {
    app.fs_sync()
        .create_folder(&folder_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn rename_folder<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    app.fs_sync()
        .rename_folder(&old_path, &new_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_folder<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    folder_path: String,
) -> Result<(), String> {
    app.fs_sync()
        .delete_folder(&folder_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn cleanup_orphan_files<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    subdir: String,
    extension: String,
    valid_ids: Vec<String>,
) -> Result<u32, String> {
    app.fs_sync()
        .cleanup_orphan_files(&subdir, &extension, valid_ids)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn cleanup_orphan_dirs<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    subdir: String,
    marker_file: String,
    valid_ids: Vec<String>,
) -> Result<u32, String> {
    app.fs_sync()
        .cleanup_orphan_dirs(&subdir, &marker_file, valid_ids)
        .map_err(|e| e.to_string())
}
