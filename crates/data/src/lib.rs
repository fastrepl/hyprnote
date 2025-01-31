const fn skip_wav_header(wav: &[u8]) -> &[u8] {
    unsafe { core::slice::from_raw_parts(wav.as_ptr().add(44), wav.len() - 44) }
}

macro_rules! include_wav {
    ($path:expr) => {{
        const WAV: &[u8] = include_bytes!($path);
        const PCM: &[u8] = skip_wav_header(WAV);
        PCM
    }};
}

pub const KOREAN_CONVERSATION: &[u8] = include_wav!("../assets/korean.wav");
pub const ENGLISH_CONVERSATION: &[u8] = include_wav!("../assets/english.wav");
