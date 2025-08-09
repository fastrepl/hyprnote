mod error;
mod service;

pub use error::*;
pub use service::*;

#[cfg(test)]
// cargo test -p transcribe-whisper-local test_service -- --nocapture
mod tests {
    use super::*;
    use hypr_audio_utils::AudioFormatExt;

    #[tokio::test]
    async fn test_service() -> Result<(), Box<dyn std::error::Error>> {
        let model_path = dirs::data_dir()
            .unwrap()
            .join("com.hyprnote.dev")
            .join("stt/ggml-small-q8_0.bin");

        let service = TranscribeService::builder().model_path(model_path).build();

        let app = axum::Router::new().route_service("/v1/listen", service);

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
        let addr = listener.local_addr()?;

        let server = axum::serve(listener, app);
        let server_handle = tokio::spawn(async move {
            if let Err(e) = server.await {
                println!("Server error: {}", e);
            }
        });

        let client = owhisper_client::ListenClient::builder()
            .api_base(format!("http://{}", addr))
            .build_single();

        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 512);

        let stream = client.from_realtime_audio(audio).await.unwrap();
        futures_util::pin_mut!(stream);

        server_handle.abort();
        Ok(())
    }
}
