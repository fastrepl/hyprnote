mod error;
mod predictor;
mod stream;

pub use error::*;
pub use predictor::*;
pub use stream::*;

use kalosm_sound::AsyncSource;
use std::time::Duration;

pub trait ChunkerExt: AsyncSource + Sized {
    fn chunks<P: Predictor + Unpin>(
        self,
        predictor: P,
        chunk_duration: Duration,
    ) -> ChunkStream<Self, P>
    where
        Self: Unpin,
    {
        ChunkStream::new(self, predictor, chunk_duration)
    }
}

impl<T: AsyncSource> ChunkerExt for T {}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    #[tokio::test]
    async fn test_rms_chunker() {
        let audio_source = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let mut stream = audio_source.chunks(RMS::new(), Duration::from_secs(15));
        let mut i = 0;

        let _ = std::fs::remove_dir_all("tmp/english_1_rms");
        let _ = std::fs::create_dir_all("tmp/english_1_rms");

        while let Some(chunk) = stream.next().await {
            let file = std::fs::File::create(format!("tmp/english_1_rms/chunk_{}.wav", i)).unwrap();
            let mut writer = hound::WavWriter::new(file, spec).unwrap();
            for sample in chunk {
                writer.write_sample(sample).unwrap();
            }
            i += 1;
        }
    }

    #[tokio::test]
    async fn test_silero_chunker() {
        let audio_source = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let silero = Silero::new().expect("Failed to create Silero predictor");
        let mut stream = audio_source.chunks(silero, Duration::from_secs(30));
        let mut i = 0;

        let _ = std::fs::remove_dir_all("tmp/english_1_silero");
        let _ = std::fs::create_dir_all("tmp/english_1_silero");

        while let Some(chunk) = stream.next().await {
            let file =
                std::fs::File::create(format!("tmp/english_1_silero/chunk_{}.wav", i)).unwrap();
            let mut writer = hound::WavWriter::new(file, spec).unwrap();
            let samples: Vec<f32> = chunk.into_iter().collect();
            println!(
                "Chunk {} has {} samples ({:.2}s)",
                i,
                samples.len(),
                samples.len() as f32 / 16000.0
            );
            for sample in samples {
                writer.write_sample(sample).unwrap();
            }
            i += 1;
        }

        assert!(i > 0, "Should have produced at least one chunk");
    }

    #[tokio::test]
    async fn test_silero_with_custom_config() {
        let config = SileroConfig {
            base_threshold: 0.3,
            confidence_window_size: 20,
            high_confidence_threshold: 0.8,
            high_confidence_speech_threshold: 0.25,
            low_confidence_speech_threshold: 0.5,
        };

        let silero = Silero::with_config(config).expect("Failed to create Silero with config");

        // Test with silence
        let silence = vec![0.0f32; 16000]; // 1 second of silence
        assert_eq!(silero.predict(&silence).unwrap(), false);

        // Test with known speech (using test data)
        let audio_samples = to_f32(hypr_data::english_1::AUDIO);
        let chunk = &audio_samples[0..480]; // 30ms chunk
        let is_speech = silero.predict(chunk).unwrap();
        // The first chunk might be silence, so we don't assert true here
        println!("First 30ms chunk detected as speech: {}", is_speech);
    }

    #[test]
    fn test_chunk_config() {
        let config = ChunkConfig::default();
        assert_eq!(config.max_duration, Duration::from_secs(30));
        assert_eq!(config.min_buffer_duration, Duration::from_secs(6));
        assert_eq!(config.silence_window_duration, Duration::from_millis(500));
        assert_eq!(config.trim_window_size, 100);
    }

    fn to_f32(bytes: &[u8]) -> Vec<f32> {
        let mut samples = Vec::with_capacity(bytes.len() / 2);
        for chunk in bytes.chunks_exact(2) {
            let sample = i16::from_le_bytes([chunk[0], chunk[1]]) as f32 / 32768.0;
            samples.push(sample);
        }
        samples
    }
}
