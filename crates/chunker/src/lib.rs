mod stream;

pub use stream::*;

use kalosm_sound::AsyncSource;
use std::time::Duration;
use voice_activity_detector::VoiceActivityDetector;

pub trait ChunkerExt: AsyncSource + Sized {
    fn chunks(self, vad: VoiceActivityDetector, chunk_duration: Duration) -> ChunkStream<Self>
    where
        Self: Unpin,
    {
        ChunkStream::new(self, vad, chunk_duration)
    }
}

impl<T: AsyncSource> ChunkerExt for T {}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;
    use voice_activity_detector::VoiceActivityDetector;

    #[tokio::test]
    async fn test_chunker() {
        let audio_source = rodio::Decoder::new_wav(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let vad = VoiceActivityDetector::builder()
            .sample_rate(16000)
            .chunk_size(512usize)
            .build()
            .unwrap();
        let mut stream = audio_source.chunks(vad, Duration::from_secs(15));
        let mut i = 0;

        std::fs::remove_dir_all("tmp/english_1").unwrap();
        std::fs::create_dir_all("tmp/english_1").unwrap();
        while let Some(chunk) = stream.next().await {
            let file = std::fs::File::create(format!("tmp/english_1/chunk_{}.wav", i)).unwrap();
            let mut writer = hound::WavWriter::new(file, spec).unwrap();
            for sample in chunk {
                writer.write_sample(sample).unwrap();
            }
            i += 1;
        }
    }
}
