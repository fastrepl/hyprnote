use owhisper_client::AdapterKind;
use std::str::FromStr;

use crate::{BatchParams, Listener2PluginExt, Subtitle, VttWord};

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
    app: tauri::AppHandle<R>,
    path: String,
) -> Result<Subtitle, String> {
    app.listener2().parse_subtitle(path)
}

#[tauri::command]
#[specta::specta]
pub async fn export_to_vtt<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    words: Vec<VttWord>,
) -> Result<String, String> {
    app.listener2().export_to_vtt(session_id, words)
}

#[tauri::command]
#[specta::specta]
pub async fn is_supported_languages<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
    provider: String,
    model: Option<String>,
    languages: Vec<String>,
) -> Result<bool, String> {
    if provider == "custom" || provider == "hyprnote" {
        return Ok(true);
    }

    let languages_parsed = languages
        .iter()
        .map(|s| hypr_language::Language::from_str(s))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("unknown_language: {}", e))?;
    let adapter_kind =
        AdapterKind::from_str(&provider).map_err(|_| format!("unknown_provider: {}", provider))?;

    Ok(adapter_kind.is_supported_languages(&languages_parsed, model.as_deref()))
}
