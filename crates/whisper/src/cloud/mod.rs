mod client;
mod types;

pub use client::*;
pub use types::*;

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    #[tokio::test]
    async fn test_cloud() {
        let client = WhisperClient::builder()
            .api_base(std::env::var("WHISPER_API_BASE").unwrap())
            .api_key(std::env::var("WHISPER_API_KEY").unwrap())
            .language(crate::Language::En)
            .build();

        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::korean_2::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let stream = client.from_audio2(audio).await.unwrap();
        futures_util::pin_mut!(stream);

        while let Some(result) = stream.next().await {
            println!("{:?}", result);
        }
    }
}
