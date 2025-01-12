pub use kalosm_sound::{AsyncSource, MicInput, MicStream};

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mic() {
        let mic = MicInput::default();
        let mut stream = mic.stream().unwrap();

        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

        let samples = stream
            .read_samples(48000 * 1)
            .await
            .into_iter()
            .collect::<Vec<_>>();

        assert!(samples.len() > 10 * 1000);
        assert!(samples.iter().any(|x| *x != 0.0));
    }
}
