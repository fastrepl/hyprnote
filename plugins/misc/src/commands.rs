use std::path::PathBuf;

use tauri_plugin_opener::OpenerExt;

use crate::audio::import_audio;
use crate::error::AudioImportError;
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
pub async fn audio_exist<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<bool, String> {
    let data_dir = dirs::data_dir().unwrap().join("hyprnote").join("sessions");
    let session_dir = data_dir.join(session_id);

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
pub async fn audio_delete<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    let data_dir = dirs::data_dir().unwrap().join("hyprnote").join("sessions");
    let session_dir = data_dir.join(session_id);

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
pub async fn audio_import<R: tauri::Runtime>(
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
    let data_dir = dirs::data_dir()
        .ok_or_else(|| AudioImportError::PathResolver("Failed to get data directory".to_string()))?
        .join("hyprnote")
        .join("sessions");
    let session_dir = data_dir.join(session_id);

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
pub async fn audio_path<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<String, String> {
    let data_dir = dirs::data_dir().unwrap().join("hyprnote").join("sessions");
    let session_dir = data_dir.join(session_id);

    let path = ["audio.ogg", "audio.wav"]
        .iter()
        .map(|format| session_dir.join(format))
        .find(|path| path.exists())
        .ok_or("audio_path_not_found")?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn audio_open<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    let data_dir = dirs::data_dir().unwrap().join("hyprnote").join("sessions");
    let session_dir = data_dir.join(session_id);

    app.opener()
        .open_path(session_dir.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_session_folder<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    let data_dir = dirs::data_dir().unwrap().join("hyprnote").join("sessions");
    let session_dir = data_dir.join(session_id);

    if session_dir.exists() {
        std::fs::remove_dir_all(session_dir).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn parse_meeting_link<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    text: String,
) -> Option<String> {
    app.parse_meeting_link(&text)
}
