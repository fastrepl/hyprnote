use std::path::PathBuf;

use hypr_audio_utils::{f32_to_i16_bytes, resample_audio, source_from_path, Source};

use crate::error::Error;

const TARGET_SAMPLE_RATE: u32 = 16000;

pub async fn decode_audio_to_linear16(path: PathBuf) -> Result<(bytes::Bytes, u32), Error> {
    tokio::task::spawn_blocking(move || -> Result<(bytes::Bytes, u32), Error> {
        let decoder =
            source_from_path(&path).map_err(|err| Error::AudioProcessing(err.to_string()))?;

        let channels = decoder.channels().max(1);

        let samples = resample_audio(decoder, TARGET_SAMPLE_RATE)
            .map_err(|err| Error::AudioProcessing(err.to_string()))?;

        let samples = mix_to_mono(samples, channels);

        if samples.is_empty() {
            return Err(Error::AudioProcessing(
                "audio file contains no samples".to_string(),
            ));
        }

        let bytes = f32_to_i16_bytes(samples.into_iter());

        Ok((bytes, TARGET_SAMPLE_RATE))
    })
    .await?
}

pub async fn decode_audio_to_bytes(path: PathBuf) -> Result<bytes::Bytes, Error> {
    let (bytes, _sample_rate) = decode_audio_to_linear16(path).await?;
    Ok(bytes)
}

fn mix_to_mono(samples: Vec<f32>, channels: u16) -> Vec<f32> {
    if channels == 1 {
        return samples;
    }

    let channels_usize = channels as usize;
    let mut mono = Vec::with_capacity(samples.len() / channels_usize);
    for frame in samples.chunks(channels_usize) {
        if frame.is_empty() {
            continue;
        }
        let sum: f32 = frame.iter().copied().sum();
        mono.push(sum / frame.len() as f32);
    }
    mono
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_decode_audio_to_linear16() {
        let path = PathBuf::from(hypr_data::english_1::AUDIO_PATH);
        let result = decode_audio_to_linear16(path).await;
        assert!(result.is_ok());
        let (bytes, sample_rate) = result.unwrap();
        assert!(!bytes.is_empty());
        assert_eq!(sample_rate, 16000);
    }

    #[tokio::test]
    async fn test_decode_audio_to_bytes() {
        let path = PathBuf::from(hypr_data::english_1::AUDIO_PATH);
        let result = decode_audio_to_bytes(path).await;
        assert!(result.is_ok());
        let bytes = result.unwrap();
        assert!(!bytes.is_empty());
    }

    #[test]
    fn test_mix_to_mono_single_channel() {
        let samples = vec![1.0, 2.0, 3.0, 4.0];
        let result = mix_to_mono(samples.clone(), 1);
        assert_eq!(result, samples);
    }

    #[test]
    fn test_mix_to_mono_stereo() {
        let samples = vec![1.0, 3.0, 2.0, 4.0];
        let result = mix_to_mono(samples, 2);
        assert_eq!(result, vec![2.0, 3.0]);
    }

    #[test]
    fn test_mix_to_mono_empty() {
        let samples: Vec<f32> = vec![];
        let result = mix_to_mono(samples, 2);
        assert!(result.is_empty());
    }
}
