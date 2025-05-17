#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::{MicInput, MicStream};

#[cfg(not(target_os = "macos"))]
pub use kalosm_sound::{MicInput, MicStream};

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    #[cfg(target_os = "macos")]
    #[tokio::test]
    async fn test_macos() {
        let mic = MicInput::default();
        let mut stream = mic.stream();

        let mut writer = hound::WavWriter::create(
            "test.wav",
            hound::WavSpec {
                channels: 1,
                sample_rate: stream.sample_rate(),
                bits_per_sample: 16,
                sample_format: hound::SampleFormat::Int,
            },
        )
        .unwrap();

        while let Some(sample) = stream.next().await {
            writer.write_sample(sample).unwrap();
        }

        writer.finalize().unwrap();
    }
}
