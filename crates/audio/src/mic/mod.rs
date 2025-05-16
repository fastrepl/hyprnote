mod macos;

#[cfg(target_os = "macos")]
pub use macos::{MicInput, MicStream};

#[cfg(target_os = "windows")]
pub use kalosm_sound::{MicInput, MicStream};

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    #[tokio::test]
    async fn test_mic() {
        let mic = MicInput::default();
        let mut stream = mic.stream();

        let mut buffer = Vec::new();
        while let Some(sample) = stream.next().await {
            buffer.push(sample);
            if buffer.len() > 6000 {
                break;
            }
        }

        assert!(buffer.iter().any(|x| *x != 0.0));
    }
}
