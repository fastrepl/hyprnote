use std::collections::HashMap;
use std::path::PathBuf;

use rayon::prelude::*;
use serde_json::Value;
use tauri_plugin_path2::Path2PluginExt;

use crate::FsSyncPluginExt;
use crate::folder::find_session_dir;
use crate::frontmatter::ParsedDocument;
use crate::types::{ListFoldersResult, ScanResult};

/// For batch I/O on many small files, sync I/O with rayon parallelism
/// is more efficient than async I/O (avoids per-file async task overhead).
/// This macro wraps sync work to prevent blocking Tauri's invoke handler.
macro_rules! spawn_blocking {
    ($body:expr) => {
        tokio::task::spawn_blocking(move || $body)
            .await
            .map_err(|e| e.to_string())?
    };
}

fn resolve_session_dir<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    session_id: &str,
) -> Result<PathBuf, String> {
    let base = app.path2().base().map_err(|e| e.to_string())?;
    Ok(find_session_dir(&base.join("sessions"), session_id))
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn deserialize(input: String) -> Result<ParsedDocument, String> {
    crate::frontmatter::deserialize(&input).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn write_json_batch(items: Vec<(Value, String)>) -> Result<(), String> {
    spawn_blocking!({
        items.into_par_iter().try_for_each(|(json, path)| {
            let path = std::path::Path::new(&path);
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let content = crate::json::serialize(json)?;
            std::fs::write(path, content).map_err(|e| e.to_string())
        })
    })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn write_document_batch(
    items: Vec<(ParsedDocument, String)>,
) -> Result<(), String> {
    spawn_blocking!({
        items.into_par_iter().try_for_each(|(doc, path)| {
            let path = std::path::Path::new(&path);
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let content = crate::frontmatter::serialize(doc).map_err(|e| e.to_string())?;
            std::fs::write(path, content).map_err(|e| e.to_string())
        })
    })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn read_document_batch(
    dir_path: String,
) -> Result<HashMap<String, ParsedDocument>, String> {
    spawn_blocking!({
        crate::frontmatter::read_document_from_dir(&dir_path).map_err(|e| e.to_string())
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

#[tauri::command]
#[specta::specta]
pub(crate) async fn audio_exist<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<bool, String> {
    let session_dir = resolve_session_dir(&app, &session_id)?;
    crate::audio::exists(&session_dir).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn audio_delete<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    let session_dir = resolve_session_dir(&app, &session_id)?;
    crate::audio::delete(&session_dir).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn audio_import<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    source_path: String,
) -> Result<String, String> {
    let session_dir = resolve_session_dir(&app, &session_id)?;
    crate::audio::import_to_session(&session_dir, &PathBuf::from(&source_path))
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn audio_path<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<String, String> {
    let session_dir = resolve_session_dir(&app, &session_id)?;
    crate::audio::path(&session_dir)
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "audio_path_not_found".to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn session_dir<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<String, String> {
    resolve_session_dir(&app, &session_id).map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_session_folder<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    let session_dir = resolve_session_dir(&app, &session_id)?;
    crate::folder::delete_session_dir(&session_dir).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn scan_and_read(
    base_dir: String,
    file_patterns: Vec<String>,
    recursive: bool,
) -> Result<ScanResult, String> {
    spawn_blocking!({
        Ok(crate::scan::scan_and_read(
            &PathBuf::from(&base_dir),
            &file_patterns,
            recursive,
        ))
    })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn chat_dir<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    chat_group_id: String,
) -> Result<String, String> {
    let base = app.path2().base().map_err(|e| e.to_string())?;
    Ok(base
        .join("chats")
        .join(&chat_group_id)
        .to_string_lossy()
        .to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn entity_dir<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    dir_name: String,
) -> Result<String, String> {
    let base = app.path2().base().map_err(|e| e.to_string())?;
    Ok(base.join(&dir_name).to_string_lossy().to_string())
}
