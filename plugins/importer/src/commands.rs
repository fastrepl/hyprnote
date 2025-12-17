use std::path::PathBuf;

use crate::ImporterPluginExt;
use crate::types::{ImportSourceInfo, ImportSourceKind, ImportedNote, ImportedTranscript};

#[tauri::command]
#[specta::specta]
pub fn list_import_sources<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Vec<ImportSourceInfo> {
    app.list_import_sources()
}

#[tauri::command]
#[specta::specta]
pub async fn import_notes<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    source: ImportSourceKind,
    supabase_path: Option<PathBuf>,
) -> Result<Vec<ImportedNote>, String> {
    app.import_notes(source, supabase_path)
        .await
        .map_err(|e: crate::Error| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn import_transcripts<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    source: ImportSourceKind,
    cache_path: Option<PathBuf>,
) -> Result<Vec<ImportedTranscript>, String> {
    app.import_transcripts(source, cache_path)
        .await
        .map_err(|e: crate::Error| e.to_string())
}
