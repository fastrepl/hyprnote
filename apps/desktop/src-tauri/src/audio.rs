fn play_audio(bytes: &'static [u8]) {
    use rodio::{Decoder, OutputStream, Sink};

    std::thread::spawn(move || {
        if let Ok((_, stream)) = OutputStream::try_default() {
            let file = std::io::Cursor::new(bytes);
            let source = Decoder::new(file).unwrap();
            let sink = Sink::try_new(&stream).unwrap();
            sink.append(source);
            sink.sleep_until_end();
        }
    });
}

pub enum AppSounds {
    StartRecording,
    StopRecording,
}

impl AppSounds {
    pub fn play(&self) {
        let bytes = self.get_sound_bytes();
        play_audio(bytes);
    }

    fn get_sound_bytes(&self) -> &'static [u8] {
        match self {
            AppSounds::StartRecording => include_bytes!("../sounds/start_recording.ogg"),
            AppSounds::StopRecording => include_bytes!("../sounds/stop_recording.ogg"),
        }
    }
}
