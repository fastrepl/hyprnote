pub const AUDIO: &[u8] = include_wav!("./audio.wav");
pub const AUDIO_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/src/english_1/audio.wav");

pub const AUDIO_PART1_8000HZ_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/src/english_1/audio_part1_8000hz.wav"
);
pub const AUDIO_PART2_16000HZ_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/src/english_1/audio_part2_16000hz.wav"
);
pub const AUDIO_PART3_22050HZ_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/src/english_1/audio_part3_22050hz.wav"
);
pub const AUDIO_PART4_32000HZ_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/src/english_1/audio_part4_32000hz.wav"
);
pub const AUDIO_PART5_44100HZ_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/src/english_1/audio_part5_44100hz.wav"
);
pub const AUDIO_PART6_48000HZ_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/src/english_1/audio_part6_48000hz.wav"
);

pub const TRANSCRIPTION_JSON: &str = include_str!("./transcription.json");

pub const TRANSCRIPTION_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/src/english_1/transcription.json"
);

pub const DIARIZATION_JSON: &str = include_str!("./diarization.json");

pub const DIARIZATION_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/src/english_1/diarization.json"
);
