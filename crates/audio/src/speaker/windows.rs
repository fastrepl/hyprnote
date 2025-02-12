pub struct SpeakerInput {}

pub struct SpeakerStream {}

impl SpeakerStream {
    pub fn new() -> Self {
        Self {}
    }

    pub fn sample_rate(&self) -> u32 {
        16000
    }
}
