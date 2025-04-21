use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

use crate::MiscPluginExt;

#[tauri::command]
#[specta::specta]
pub async fn get_git_hash<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    Ok(app.get_git_hash())
}

#[tauri::command]
#[specta::specta]
pub async fn get_fingerprint<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    Ok(app.get_fingerprint())
}

#[tauri::command]
#[specta::specta]
pub async fn opinionated_md_to_html<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    text: String,
) -> Result<String, String> {
    app.opinionated_md_to_html(&text)
}

#[tauri::command]
#[specta::specta]
pub async fn open_audio<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().unwrap();
    let audio_path = data_dir.join(session_id).join("audio.wav");

    app.opener()
        .reveal_item_in_dir(&audio_path)
        .map_err(|e| e.to_string())?;

    Ok(())
}
