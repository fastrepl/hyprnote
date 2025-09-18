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
pub async fn audio_exist<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<bool, String> {
    let data_dir = app.path().app_data_dir().unwrap();
    let audio_path = data_dir.join(session_id).join("audio.wav");

    let v = std::fs::exists(audio_path).map_err(|e| e.to_string())?;
    Ok(v)
}

#[tauri::command]
#[specta::specta]
pub async fn audio_delete<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().unwrap();
    let audio_path = data_dir.join(session_id).join("audio.wav");

    std::fs::remove_file(audio_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn audio_open<R: tauri::Runtime>(
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

#[tauri::command]
#[specta::specta]
pub async fn delete_session_folder<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().unwrap();
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

#[tauri::command]
#[specta::specta]
pub async fn image_upload<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    image_data: Vec<u8>,
    extension: String,
) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().unwrap();
    let session_dir = data_dir.join(&session_id);
    let images_dir = session_dir.join("images");
    
    // Create directories if they don't exist
    std::fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
    
    // Generate unique filename
    let uuid = uuid::Uuid::new_v4();
    let filename = format!("{}.{}", uuid, extension);
    let file_path = images_dir.join(&filename);
    
    // Write image data to file
    std::fs::write(&file_path, image_data).map_err(|e| e.to_string())?;
    
    // Return tauri local URL
    let url = format!("tauri://localhost/{}/images/{}", session_id, filename);
    Ok(url)
}

#[tauri::command]
#[specta::specta]
pub async fn image_delete<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    image_filename: String,
) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().unwrap();
    let image_path = data_dir.join(session_id).join("images").join(image_filename);
    
    if image_path.exists() {
        std::fs::remove_file(image_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
