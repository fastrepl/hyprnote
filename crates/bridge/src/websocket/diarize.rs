use futures_util::Stream;
use futures_util::StreamExt;
use tokio_tungstenite::tungstenite::ClientRequestBuilder;

use super::{WebSocketClient, WebSocketIO};
use crate::{DiarizeInputChunk, DiarizeOutputChunk};

#[derive(Default)]
pub struct DiarizeClientBuilder {
    api_base: Option<String>,
    api_key: Option<String>,
    sample_rate: Option<u32>,
}

impl DiarizeClientBuilder {
    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn sample_rate(mut self, sample_rate: u32) -> Self {
        self.sample_rate = Some(sample_rate);
        self
    }

    pub fn build(self) -> DiarizeClient {
        let uri = {
            let mut url: url::Url = self.api_base.unwrap().parse().unwrap();
            url.set_scheme("wss").unwrap();
            url.set_path("/diarize");
            url.query_pairs_mut()
                .append_pair("sample_rate", &self.sample_rate.unwrap().to_string())
                .append_pair("token", &self.api_key.unwrap());

            url.to_string().parse().unwrap()
        };

        DiarizeClient {
            request: ClientRequestBuilder::new(uri),
        }
    }
}

#[derive(Clone)]
pub struct DiarizeClient {
    request: ClientRequestBuilder,
}

impl WebSocketIO for DiarizeClient {
    type Input = DiarizeInputChunk;
    type Output = DiarizeOutputChunk;

    fn create_input(data: bytes::Bytes) -> Self::Input {
        DiarizeInputChunk {
            audio: data.to_vec(),
        }
    }
}

impl DiarizeClient {
    pub fn builder() -> DiarizeClientBuilder {
        DiarizeClientBuilder::default()
    }

    pub async fn from_audio<S, E>(
        &self,
        stream: S,
    ) -> Result<impl Stream<Item = DiarizeOutputChunk>, crate::Error>
    where
        S: Stream<Item = Result<bytes::Bytes, E>> + Send + Unpin + 'static,
        E: std::error::Error + Send + Sync + 'static,
    {
        let ws = WebSocketClient::new(self.request.clone());

        let stream = stream.map(|item| item.unwrap());

        ws.from_audio::<Self>(stream).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;

    fn stream_from_bytes(
        bytes: &[u8],
    ) -> impl Stream<Item = Result<bytes::Bytes, std::io::Error>> + Send + Unpin + 'static {
        const SAMPLE_RATE: usize = 16000;
        const NUM_SAMPLES: usize = SAMPLE_RATE / 10;
        const CHUNK_SIZE_BYTES: usize = NUM_SAMPLES * (16 / 8);
        const DELAY_MS: usize = (1000 * NUM_SAMPLES) / SAMPLE_RATE;

        let bytes = bytes.to_vec();

        let stream = async_stream::stream! {
            let mut buffer = vec![0u8; CHUNK_SIZE_BYTES];
            let mut cursor = std::io::Cursor::new(bytes);

            loop {
                match cursor.read(&mut buffer) {
                    Ok(n) if n == 0 => break,
                    Ok(n) => {
                        let chunk = bytes::Bytes::copy_from_slice(&buffer[..n]);
                        tokio::time::sleep(tokio::time::Duration::from_millis(DELAY_MS as u64)).await;
                        yield Ok(chunk);
                    }
                    Err(e) => yield Err(e),
                }
            }
        };

        Box::pin(stream)
    }

    // RUST_TEST_TIMEOUT=0 cargo test -p bridge test_diarize -- --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_diarize() {
        let client = DiarizeClient::builder()
            .api_base("https://fastrepl--hyprnote-diart-server-serve.modal.run")
            .api_key("TODO")
            .sample_rate(16000)
            .build();

        let audio_stream = stream_from_bytes(hypr_data::DIART);

        let mut diarize_stream = Box::pin(client.from_audio(audio_stream).await.unwrap());
        let now = std::time::Instant::now();
        while let Some(item) = diarize_stream.next().await {
            println!("+{} | {:?}", now.elapsed().as_secs_f32(), item);
        }
    }
}
