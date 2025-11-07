use crate::AppExt;

use aspasia::{Subtitle as SubtitleTrait, TimedSubtitleFile, WebVttSubtitle};

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct Token {
    text: String,
    start_time: u64,
    end_time: u64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct Subtitle {
    tokens: Vec<Token>,
}

impl From<TimedSubtitleFile> for Subtitle {
    fn from(sub: TimedSubtitleFile) -> Self {
        let vtt: WebVttSubtitle = sub.into();

        let tokens = vtt
            .events()
            .iter()
            .map(|cue| Token {
                text: cue.text.clone(),
                start_time: i64::from(cue.start) as u64,
                end_time: i64::from(cue.end) as u64,
            })
            .collect();

        Self { tokens }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn parse_subtitle<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
    path: String,
) -> Result<Subtitle, String> {
    let sub = TimedSubtitleFile::new(&path).unwrap();
    Ok(sub.into())
}

#[tauri::command]
#[specta::specta]
pub async fn get_onboarding_needed<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_onboarding_needed().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_onboarding_needed<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    v: bool,
) -> Result<(), String> {
    app.set_onboarding_needed(v).map_err(|e| e.to_string())
}
