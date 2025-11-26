use crate::{BatchParams, Listener2PluginExt, Subtitle};

#[tauri::command]
#[specta::specta]
pub async fn run_batch<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    params: BatchParams,
) -> Result<(), String> {
    app.run_batch(params).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn parse_subtitle<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
    path: String,
) -> Result<Subtitle, String> {
    use aspasia::TimedSubtitleFile;
    let sub = TimedSubtitleFile::new(&path).unwrap();
    Ok(sub.into())
}
