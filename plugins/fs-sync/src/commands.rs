use std::path::PathBuf;

use rayon::prelude::*;
use serde_json::Value;
use tauri_plugin_path2::Path2PluginExt;

use crate::FsSyncPluginExt;
use crate::audio::import_audio;
use crate::error::AudioImportError;
use crate::folder::find_session_dir;
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

#[tauri::command]
#[specta::specta]
pub(crate) async fn audio_exist<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<bool, String> {
    let base = app.path2().base().map_err(|e| e.to_string())?;
    let session_dir = find_session_dir(&base.join("sessions"), &session_id);

    ["audio.wav", "audio.ogg"]
        .iter()
        .map(|format| session_dir.join(format))
        .try_fold(false, |acc, path| {
            std::fs::exists(path)
                .map(|exists| acc || exists)
                .map_err(|e| e.to_string())
        })
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn audio_delete<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    let base = app.path2().base().map_err(|e| e.to_string())?;
    let session_dir = find_session_dir(&base.join("sessions"), &session_id);

    ["audio.wav", "audio.ogg"]
        .iter()
        .map(|format| session_dir.join(format))
        .try_for_each(|path| {
            if std::fs::exists(&path).unwrap_or(false) {
                std::fs::remove_file(path).map_err(|e| e.to_string())
            } else {
                Ok(())
            }
        })?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn audio_import<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    source_path: String,
) -> Result<String, String> {
    audio_import_internal(&app, &session_id, &source_path)
        .map(|final_path| final_path.to_string_lossy().to_string())
        .map_err(|err| err.to_string())
}

fn audio_import_internal<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    session_id: &str,
    source_path: &str,
) -> Result<PathBuf, AudioImportError> {
    let base = app
        .path2()
        .base()
        .map_err(|e| AudioImportError::PathResolver(e.to_string()))?;
    let session_dir = find_session_dir(&base.join("sessions"), session_id);

    std::fs::create_dir_all(&session_dir)?;

    let target_path = session_dir.join("audio.ogg");
    let tmp_path = session_dir.join("audio.ogg.tmp");

    if tmp_path.exists() {
        std::fs::remove_file(&tmp_path)?;
    }

    let source = PathBuf::from(source_path);
    match import_audio(&source, &tmp_path, &target_path) {
        Ok(final_path) => Ok(final_path),
        Err(error) => {
            if tmp_path.exists() {
                let _ = std::fs::remove_file(&tmp_path);
            }
            Err(error.into())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn audio_path<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<String, String> {
    let base = app.path2().base().map_err(|e| e.to_string())?;
    let session_dir = find_session_dir(&base.join("sessions"), &session_id);

    let path = ["audio.ogg", "audio.wav"]
        .iter()
        .map(|format| session_dir.join(format))
        .find(|path| path.exists())
        .ok_or("audio_path_not_found")?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn session_dir<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<String, String> {
    let base = app.path2().base().map_err(|e| e.to_string())?;
    let session_dir = find_session_dir(&base.join("sessions"), &session_id);
    Ok(session_dir.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn delete_session_folder<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    let base = app.path2().base().map_err(|e| e.to_string())?;
    let session_dir = find_session_dir(&base.join("sessions"), &session_id);

    if session_dir.exists() {
        std::fs::remove_dir_all(session_dir).map_err(|e| e.to_string())?;
    }

    Ok(())
}
