pub const AUDIO: &[u8] = include_wav!("./audio.wav");

pub const AUDIO_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/src/mixed_en_ko_1/audio.wav");

pub const TRANSCRIPTION_JSON: &str = include_str!("./transcription.json");

pub const TRANSCRIPTION_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/src/mixed_en_ko_1/transcription.json"
);

pub const DIARIZATION_JSON: &str = include_str!("./diarization.json");

pub const DIARIZATION_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/src/mixed_en_ko_1/diarization.json"
);

pub const LANGUAGES: &[&str] = &["en", "ko"];

pub const GROUND_TRUTH_TEXT: &str = "Hello, 안녕하세요. How are you today? 오늘 날씨가 좋네요. Nice to meet you, 만나서 반갑습니다.";
