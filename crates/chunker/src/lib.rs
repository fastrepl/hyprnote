mod audio_analysis;
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

    fn chunks_with_config<P: Predictor + Unpin>(
        self,
        predictor: P,
        config: ChunkConfig,
    ) -> ChunkStream<Self, P>
    where
        Self: Unpin,
    {
        ChunkStream::with_config(self, predictor, config)
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

        std::fs::remove_dir_all("tmp/english_1_rms").ok(); // Ignore if doesn't exist
        std::fs::create_dir_all("tmp/english_1_rms").expect("Failed to create test directory");

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

        std::fs::remove_dir_all("tmp/english_1_silero").ok(); // Ignore if doesn't exist
        std::fs::create_dir_all("tmp/english_1_silero").expect("Failed to create test directory");

        // Process up to 5 chunks to avoid test timeout
        let max_chunks = 5;
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

            if i >= max_chunks {
                println!("Reached max chunks limit, stopping test");
                break;
            }
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
        assert_eq!(
            silero.predict(&silence).unwrap(),
            false,
            "Should not detect speech in silence"
        );
    }

    #[test]
    fn test_chunk_config() {
        let config = ChunkConfig::default();
        assert_eq!(config.max_duration, Duration::from_secs(30));
        assert_eq!(config.min_buffer_duration, Duration::from_secs(6));
        assert_eq!(config.silence_window_duration, Duration::from_millis(200)); // Aggressive default
        assert_eq!(config.trim_window_size, 240); // Aggressive default
        assert_eq!(
            config.hallucination_prevention,
            HallucinationPreventionLevel::Aggressive // Default to Aggressive
        );
        assert_eq!(config.end_speech_threshold, 0.65);
        assert_eq!(config.min_energy_ratio, 0.15);
    }

    #[test]
    fn test_aggressive_config() {
        let config = ChunkConfig::default()
            .with_hallucination_prevention(HallucinationPreventionLevel::Aggressive);

        assert_eq!(config.trim_window_size, 240);
        assert_eq!(config.silence_window_duration, Duration::from_millis(200));
        assert_eq!(config.end_speech_threshold, 0.65);
        assert_eq!(config.min_energy_ratio, 0.15);
    }

    #[test]
    fn test_paranoid_config() {
        let config = ChunkConfig::default()
            .with_hallucination_prevention(HallucinationPreventionLevel::Paranoid);

        assert_eq!(config.trim_window_size, 160);
        assert_eq!(config.silence_window_duration, Duration::from_millis(100));
        assert_eq!(config.end_speech_threshold, 0.7);
        assert_eq!(config.min_energy_ratio, 0.2);
        assert_eq!(config.energy_cliff_threshold, 0.15);
    }

    #[tokio::test]
    async fn test_aggressive_trimming() {
        // Create audio with trailing silence that might trigger hallucinations
        let mut audio_with_silence = Vec::new();

        // Add 1 second of speech-like signal
        for i in 0..16000 {
            let t = i as f32 / 16000.0;
            audio_with_silence.push((t * 440.0 * 2.0 * std::f32::consts::PI).sin() * 0.3);
        }

        // Add 2 seconds of very low noise (hallucination trigger)
        for _ in 0..32000 {
            audio_with_silence.push(rand::random::<f32>() * 0.001 - 0.0005);
        }

        // Test with different prevention levels
        let configs = vec![
            (ChunkConfig::default(), "normal"),
            (
                ChunkConfig::default()
                    .with_hallucination_prevention(HallucinationPreventionLevel::Aggressive),
                "aggressive",
            ),
            (
                ChunkConfig::default()
                    .with_hallucination_prevention(HallucinationPreventionLevel::Paranoid),
                "paranoid",
            ),
        ];

        for (config, level) in configs {
            let mut data = audio_with_silence.clone();
            let original_len = data.len();

            // We need a mock predictor for testing
            let predictor = Silero::new().unwrap_or_else(|_| {
                // Fallback to RMS if Silero fails
                panic!("Silero initialization failed in test");
            });

            // Use dummy type for testing - we only care about the trim_silence logic
            ChunkStream::<kalosm_sound::MicStream, _>::trim_silence(&predictor, &config, &mut data);

            println!(
                "{} mode: trimmed from {} to {} samples",
                level,
                original_len,
                data.len()
            );

            // Verify more aggressive modes trim more
            match config.hallucination_prevention {
                HallucinationPreventionLevel::Normal => {
                    assert!(data.len() < original_len, "Should trim some silence");
                }
                HallucinationPreventionLevel::Aggressive => {
                    assert!(
                        data.len() < (original_len as f32 * 0.6) as usize,
                        "Aggressive should trim most silence"
                    );
                }
                HallucinationPreventionLevel::Paranoid => {
                    assert!(
                        data.len() < (original_len as f32 * 0.4) as usize,
                        "Paranoid should trim even more"
                    );
                }
            }
        }
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
