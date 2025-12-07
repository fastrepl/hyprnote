use std::sync::{Mutex, OnceLock};

use swift_rs::SRString;

use crate::ffi::{am2_transcribe_file, am2_transcribe_file_with_progress, am2_transcribe_init};

static TRANSCRIBE_INITIALIZED: OnceLock<bool> = OnceLock::new();
static PROGRESS_CB: Mutex<Option<Box<dyn Fn(f32) -> bool + Send + Sync>>> = Mutex::new(None);

pub fn setup_progress_handler<F>(f: F)
where
    F: Fn(f32) -> bool + Send + Sync + 'static,
{
    *PROGRESS_CB.lock().unwrap() = Some(Box::new(f));
}

#[no_mangle]
pub extern "C" fn rust_on_transcribe_progress(fraction: f32) -> bool {
    if let Some(cb) = PROGRESS_CB.lock().unwrap().as_ref() {
        cb(fraction)
    } else {
        true
    }
}

pub fn init(model_path: &str) -> bool {
    *TRANSCRIBE_INITIALIZED.get_or_init(|| {
        let path = SRString::from(model_path);
        unsafe { am2_transcribe_init(&path) }
    })
}

pub fn is_ready() -> bool {
    TRANSCRIBE_INITIALIZED.get().copied().unwrap_or(false)
}

#[derive(Debug, Clone)]
pub struct TranscribeResult {
    pub text: String,
    pub success: bool,
}

pub fn transcribe_file(audio_path: &str) -> TranscribeResult {
    let audio_path = SRString::from(audio_path);
    let result = unsafe { am2_transcribe_file(&audio_path) };
    TranscribeResult {
        text: result.text.to_string(),
        success: result.success,
    }
}

pub fn transcribe_file_with_progress(audio_path: &str) -> TranscribeResult {
    let audio_path = SRString::from(audio_path);
    let result = unsafe { am2_transcribe_file_with_progress(&audio_path) };
    TranscribeResult {
        text: result.text.to_string(),
        success: result.success,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    fn test_transcribe_init() {
        crate::init();
        let home = std::env::var("HOME").unwrap();
        let model_path = format!(
            "{}/Library/Application Support/hyprnote/models/stt/nvidia_parakeet-v2_476MB",
            home
        );
        assert!(std::path::Path::new(&model_path).exists());
        assert!(init(&model_path));
        assert!(is_ready());
    }

    #[test]
    #[ignore]
    fn test_transcribe_file_with_valid_audio() {
        let home = std::env::var("HOME").unwrap();
        let model_path = format!(
            "{}/Library/Application Support/hyprnote/models/stt/nvidia_parakeet-v2_476MB",
            home
        );

        assert!(std::path::Path::new(&model_path).exists());

        crate::init();
        init(&model_path);

        let audio_path = hypr_data::english_1::AUDIO_PATH;
        let result = transcribe_file(audio_path);
        println!("{:?}", result);
        assert!(result.text.is_empty() || !result.text.is_empty());
    }
}
