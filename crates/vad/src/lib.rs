mod continuous;
mod error;

pub use continuous::*;
pub use error::*;

#[cfg(test)]
pub mod tests {

    use futures_util::StreamExt;
    use rodio::Source;

    use super::*;

    #[tokio::test]
    async fn test_no_audio_drops_for_continuous_vad() {
        let all_audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .convert_samples::<f32>()
        .collect::<Vec<_>>();

        let vad = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .with_vad(silero_rs::VadConfig::default());

        let all_audio_from_vad = vad
            .filter_map(|item| async move {
                match item {
                    Ok(VadStreamItem::AudioSamples(samples)) => Some(samples),
                    _ => None,
                }
            })
            .collect::<Vec<_>>()
            .await
            .into_iter()
            .flatten()
            .collect::<Vec<f32>>();

        assert_eq!(all_audio, all_audio_from_vad);
    }

    #[tokio::test]
    async fn test_no_speech_drops_for_vad_chunks() {
        let vad = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .speech_chunks(std::time::Duration::from_millis(50));

        let all_audio_from_vad = vad
            .filter_map(|item| async move {
                match item {
                    Ok(AudioChunk { samples }) => Some(samples),
                    _ => None,
                }
            })
            .collect::<Vec<_>>()
            .await
            .into_iter()
            .flatten()
            .collect::<Vec<f32>>();

        let how_many_sec = (all_audio_from_vad.len() as f64 / 16.0) / 1000.0;
        assert!(how_many_sec > 100.0);

        let wav = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };
        let mut writer = hound::WavWriter::create("./test.wav", wav).unwrap();
        for sample in all_audio_from_vad {
            writer.write_sample(sample).unwrap();
        }
    }
}
