use tauri::{path::BaseDirectory, Manager};

use crate::{BatchParams, Listener2PluginExt, Subtitle, VttWord};

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

#[tauri::command]
#[specta::specta]
pub async fn export_to_vtt<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    words: Vec<VttWord>,
) -> Result<String, String> {
    use aspasia::{webvtt::WebVttCue, Moment, Subtitle, WebVttSubtitle};

    let data_dir = app
        .path()
        .resolve("hyprnote/sessions", BaseDirectory::Data)
        .map_err(|e| e.to_string())?;
    let session_dir = data_dir.join(&session_id);

    std::fs::create_dir_all(&session_dir).map_err(|e| e.to_string())?;

    let vtt_path = session_dir.join("transcript.vtt");

    let cues: Vec<WebVttCue> = words
        .into_iter()
        .map(|word| WebVttCue {
            identifier: None,
            text: word.text,
            settings: None,
            start: Moment::from(word.start_ms as i64),
            end: Moment::from(word.end_ms as i64),
        })
        .collect();

    let vtt = WebVttSubtitle::builder().cues(cues).build();
    vtt.export(&vtt_path).map_err(|e| e.to_string())?;

    Ok(vtt_path.to_string_lossy().to_string())
}
