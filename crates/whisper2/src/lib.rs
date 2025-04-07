// https://github.com/tazz4843/whisper-rs/blob/master/examples/audio_transcription.rs

mod stream;
pub use stream::*;

mod model;
pub use model::*;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::TranscribeChunkedAudioStreamExt;

    #[tokio::test]
    async fn test_whisper() {
        let _a = rodio::Decoder::new_wav(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();
    }
}
