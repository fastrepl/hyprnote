use tauri::{Manager, path::BaseDirectory};

use crate::{
    BatchParams, Listener2PluginExt, Subtitle, VttWord, export_words_to_vtt,
    parse_subtitle_from_path,
};

#[tauri::command]
#[specta::specta]
pub async fn run_batch<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    params: BatchParams,
) -> Result<(), String> {
    app.listener2()
        .run_batch(params)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn parse_subtitle<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
    path: String,
) -> Result<Subtitle, String> {
    parse_subtitle_from_path(&path)
}

#[tauri::command]
#[specta::specta]
pub async fn export_to_vtt<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    words: Vec<VttWord>,
) -> Result<String, String> {
    let data_dir = app
        .path()
        .resolve("hyprnote/sessions", BaseDirectory::Data)
        .map_err(|e| e.to_string())?;
    let session_dir = data_dir.join(&session_id);

    std::fs::create_dir_all(&session_dir).map_err(|e| e.to_string())?;

    let vtt_path = session_dir.join("transcript.vtt");

    export_words_to_vtt(words, &vtt_path)?;

    Ok(vtt_path.to_string_lossy().to_string())
}
