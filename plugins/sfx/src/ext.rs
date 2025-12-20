use once_cell::sync::Lazy;
use std::sync::Mutex;

static PLAYING_SOUNDS: Lazy<
    Mutex<std::collections::HashMap<AppSounds, std::sync::mpsc::Sender<()>>>,
> = Lazy::new(|| Mutex::new(std::collections::HashMap::new()));

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type, Clone, PartialEq, Eq, Hash)]
pub enum AppSounds {
    StartRecording,
    StopRecording,
    BGM,
}

pub fn to_speaker(bytes: &'static [u8]) -> std::sync::mpsc::Sender<()> {
    use rodio::{Decoder, OutputStream, Sink};
    let (tx, rx) = std::sync::mpsc::channel();

    std::thread::spawn(move || {
        eprintln!("[sfx] attempting to play audio, bytes len: {}", bytes.len());
        tracing::info!("sfx: attempting to play audio, bytes len: {}", bytes.len());

        match OutputStream::try_default() {
            Ok((stream, stream_handle)) => {
                eprintln!("[sfx] got output stream");
                tracing::info!("sfx: got output stream");
                let file = std::io::Cursor::new(bytes);

                match Decoder::new(file) {
                    Ok(source) => {
                        eprintln!("[sfx] decoded audio source successfully");
                        tracing::info!("sfx: decoded audio source");

                        match Sink::try_new(&stream_handle) {
                            Ok(sink) => {
                                eprintln!("[sfx] created sink, appending source and playing");
                                tracing::info!("sfx: created sink, appending source");
                                sink.append(source);

                                let _ = rx.recv_timeout(std::time::Duration::from_secs(3600));
                                eprintln!("[sfx] stopping playback");
                                sink.stop();
                                drop(stream);
                            }
                            Err(e) => {
                                eprintln!("[sfx] ERROR: failed to create sink: {:?}", e);
                                tracing::error!("sfx: failed to create sink: {:?}", e);
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("[sfx] ERROR: failed to decode audio: {:?}", e);
                        tracing::error!("sfx: failed to decode audio: {:?}", e);
                    }
                }
            }
            Err(e) => {
                eprintln!("[sfx] ERROR: failed to get output stream: {:?}", e);
                tracing::error!("sfx: failed to get output stream: {:?}", e);
            }
        }
    });

    tx
}

impl AppSounds {
    pub fn play(&self) {
        self.stop();

        let bytes = self.get_sound_bytes();
        let stop_sender = to_speaker(bytes);

        {
            let mut sounds = PLAYING_SOUNDS.lock().unwrap();
            sounds.insert(self.clone(), stop_sender);
        }
    }

    pub fn stop(&self) {
        let mut sounds = PLAYING_SOUNDS.lock().unwrap();
        if let Some(tx) = sounds.remove(self) {
            let _ = tx.send(());
        }
    }

    fn get_sound_bytes(&self) -> &'static [u8] {
        match self {
            AppSounds::StartRecording => include_bytes!("../sounds/start_recording.ogg"),
            AppSounds::StopRecording => include_bytes!("../sounds/stop_recording.ogg"),
            AppSounds::BGM => include_bytes!("../sounds/bgm.mp3"),
        }
    }
}

pub struct Sfx<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Sfx<'a, R, M> {
    pub fn play(&self, sfx: AppSounds) {
        let _ = self.manager;
        sfx.play();
    }

    pub fn stop(&self, sfx: AppSounds) {
        let _ = self.manager;
        sfx.stop();
    }
}

pub trait SfxPluginExt<R: tauri::Runtime> {
    fn sfx(&self) -> Sfx<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> SfxPluginExt<R> for T {
    fn sfx(&self) -> Sfx<'_, R, Self>
    where
        Self: Sized,
    {
        Sfx {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
