use aspasia::{Subtitle as SubtitleTrait, TimedSubtitleFile, WebVttSubtitle};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, PartialEq)]
pub struct Token {
    pub text: String,
    pub start_time: u64,
    pub end_time: u64,
    pub speaker: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, PartialEq)]
pub struct VttWord {
    pub text: String,
    pub start_ms: u64,
    pub end_ms: u64,
    pub speaker: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, PartialEq)]
pub struct Subtitle {
    pub tokens: Vec<Token>,
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
                speaker: cue.identifier.as_ref().filter(|s| !s.is_empty()).cloned(),
            })
            .collect();

        Self { tokens }
    }
}
