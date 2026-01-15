pub const AUDIO: &[u8] = include_wav!("./audio.wav");

pub const AUDIO_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/src/german_1/audio.wav");

pub const TRANSCRIPTION_JSON: &str = include_str!("./transcription.json");

pub const TRANSCRIPTION_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/src/german_1/transcription.json"
);

pub const DIARIZATION_JSON: &str = include_str!("./diarization.json");

pub const DIARIZATION_PATH: &str =
    concat!(env!("CARGO_MANIFEST_DIR"), "/src/german_1/diarization.json");

pub const LANGUAGE: &str = "de";

pub const GROUND_TRUTH_TEXT: &str =
    "Guten Tag, wie geht es Ihnen heute? Ich hoffe, Sie haben einen schönen Tag.";
