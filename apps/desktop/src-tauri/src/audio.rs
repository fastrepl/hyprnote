use hypr_audio::Audio;

pub enum AppSounds {
    StartRecording,
    StopRecording,
}

impl AppSounds {
    pub fn play(&self) {
        let bytes = self.get_sound_bytes();
        Audio::to_speaker(bytes);
    }

    fn get_sound_bytes(&self) -> &'static [u8] {
        match self {
            AppSounds::StartRecording => include_bytes!("../sounds/start_recording.ogg"),
            AppSounds::StopRecording => include_bytes!("../sounds/stop_recording.ogg"),
        }
    }
}
