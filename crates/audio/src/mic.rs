use futures::StreamExt;
use kalosm_sound::rodio::Source;
use kalosm_sound::MicInput;

async fn main2() {
    let mic = MicInput::default();
    let stream = mic.stream().unwrap();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mic() {
        main2().await;
    }
}
