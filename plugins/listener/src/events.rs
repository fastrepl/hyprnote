#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
        $item
    };
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum SessionEvent {
        #[serde(rename = "inactive")]
        Inactive {},
        #[serde(rename = "running_active")]
        RunningActive {},
        #[serde(rename = "running_paused")]
        RunningPaused {},
        #[serde(rename = "words")]
        Words {
            words: Vec<hypr_listener_interface::Word>,
        },
        #[serde(rename = "audioAmplitude")]
        AudioAmplitude { mic: u16, speaker: u16 },
    }
}

impl From<(&[f32], &[f32])> for SessionEvent {
    fn from((mic_chunk, speaker_chunk): (&[f32], &[f32])) -> Self {
        let mic = (mic_chunk
            .iter()
            .map(|&x| x.abs())
            .max_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(0.0)
            * 100.0) as u16;

        let speaker = (speaker_chunk
            .iter()
            .map(|&x| x.abs())
            .max_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(0.0)
            * 100.0) as u16;

        Self::AudioAmplitude { mic, speaker }
    }
}

impl From<(&Vec<f32>, &Vec<f32>)> for SessionEvent {
    fn from((mic_chunk, speaker_chunk): (&Vec<f32>, &Vec<f32>)) -> Self {
        Self::from((mic_chunk.as_slice(), speaker_chunk.as_slice()))
    }
}
