use swift_rs::{swift, SRString};

swift!(fn initialize_am2_sdk(api_key: &SRString));

swift!(fn check_am2_ready() -> bool);

swift!(fn transcribe_audio_file(path: &SRString) -> SRString);

pub fn init(api_key: &str) {
    let key = SRString::from(api_key);
    unsafe {
        initialize_am2_sdk(&key);
    }
}

pub fn is_ready() -> bool {
    unsafe { check_am2_ready() }
}

pub fn transcribe(audio_path: &str) -> String {
    let path = SRString::from(audio_path);
    unsafe { transcribe_audio_file(&path).to_string() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_am2_swift_compilation() {
        let api_key = std::env::var("AM_API_KEY").expect("AM_API_KEY env var required");
        init(&api_key);
        assert!(is_ready());
    }

    #[test]
    fn test_transcribe_audio() {
        let api_key = std::env::var("AM_API_KEY").expect("AM_API_KEY env var required");
        init(&api_key);

        let audio_path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../data/src/english_1/audio.wav"
        );
        println!("Audio path: {}", audio_path);

        let result = transcribe(audio_path);
        println!("Transcription result: {}", result);

        assert!(!result.is_empty());
        assert!(!result.starts_with("Error:"));
    }
}
