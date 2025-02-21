#[derive(Debug, Clone, serde::Serialize, specta::Type)]
#[serde(tag = "type")]
pub enum SessionEvent {
    #[serde(rename = "stopped")]
    Stopped,
    #[serde(rename = "timelineView")]
    TimelineView(SessionEventTimelineView),
    #[serde(rename = "audioAmplitude")]
    AudioAmplitude(SessionEventAudioAmplitude),
}

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub struct SessionEventTimelineView {
    pub timeline: hypr_bridge::TimelineView,
}

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub struct SessionEventAudioAmplitude {
    pub mic: u16,
    pub speaker: u16,
}

impl From<(&[f32], &[f32])> for SessionEventAudioAmplitude {
    fn from((mic_chunk, speaker_chunk): (&[f32], &[f32])) -> Self {
        Self {
            mic: (mic_chunk
                .iter()
                .map(|&x| x.abs())
                .max_by(|a, b| a.partial_cmp(b).unwrap())
                .unwrap_or(0.0)
                * 100.0) as u16,
            speaker: (speaker_chunk
                .iter()
                .map(|&x| x.abs())
                .max_by(|a, b| a.partial_cmp(b).unwrap())
                .unwrap_or(0.0)
                * 100.0) as u16,
        }
    }
}

impl From<(&Vec<f32>, &Vec<f32>)> for SessionEventAudioAmplitude {
    fn from((mic_chunk, speaker_chunk): (&Vec<f32>, &Vec<f32>)) -> Self {
        Self::from((mic_chunk.as_slice(), speaker_chunk.as_slice()))
    }
}
