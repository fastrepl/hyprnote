use crate::LocalSttPluginExt;
use tauri::{ipc::Channel, Manager};

#[tauri::command]
#[specta::specta]
pub async fn is_server_running<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> bool {
    app.is_server_running().await
}

#[tauri::command]
#[specta::specta]
pub async fn is_model_downloaded<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    let base_path = app
        .path()
        .app_data_dir()
        .unwrap()
        .join("Demonthos/candle-quantized-whisper-large-v3-turbo/main/");

    let model_path = base_path.join("model.gguf");
    let config_path = base_path.join("config.json");
    let tokenizer_path = base_path.join("tokenizer.json");

    if [&model_path, &config_path, &tokenizer_path]
        .iter()
        .any(|p| !p.exists())
    {
        return Ok(false);
    }

    for (path, expected) in [
        (model_path, 800664009),
        (config_path, 472563957),
        (tokenizer_path, 1395948910),
    ] {
        let actual = hypr_file::calculate_file_checksum(path).map_err(|e| e.to_string())?;

        if actual != expected {
            return Ok(false);
        }
    }

    Ok(true)
}

#[tauri::command]
#[specta::specta]
pub async fn download_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    channel: Channel<u8>,
) -> Result<(), String> {
    let base = app
        .path()
        .app_data_dir()
        .unwrap()
        .join("Demonthos/candle-quantized-whisper-large-v3-turbo/main/");

    app.download_config(base.join("config.json")).await.unwrap();
    app.download_tokenizer(base.join("tokenizer.json"))
        .await
        .unwrap();

    app.download_model(base.join("model.gguf"), channel)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn start_server<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().unwrap();

    app.start_server(data_dir).await
}

#[tauri::command]
#[specta::specta]
pub async fn stop_server<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.stop_server().await
}
