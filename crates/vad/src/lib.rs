// https://github.com/nkeenan38/voice_activity_detector/blob/main/src/vad.rs

#[derive(Debug, Default)]
pub struct VoiceActivityDetectorBuilder {}

#[derive(Debug)]
pub struct VoiceActivityDetector {}

impl VoiceActivityDetector {
    pub fn builder() -> VoiceActivityDetectorBuilder {
        VoiceActivityDetectorBuilder::default()
    }
}
