use futures_util::{Stream, StreamExt};

use hypr_ws::client::{ClientRequestBuilder, Message, WebSocketClient, WebSocketIO};

#[derive(Default)]
pub struct DiarizeClientBuilder {
    api_base: Option<String>,
    api_key: Option<String>,
    sample_rate: Option<u32>,
    max_speakers: Option<u32>,
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

    pub fn max_speakers(mut self, max_speakers: u32) -> Self {
        self.max_speakers = Some(max_speakers);
        self
    }

    pub fn build(self) -> DiarizeClient {
        let uri = {
            let mut url: url::Url = self.api_base.unwrap().parse().unwrap();
            url.set_scheme("wss").unwrap();
            url.set_path("/diarize");
            url.query_pairs_mut()
                .append_pair("sample_rate", &self.sample_rate.unwrap().to_string())
                .append_pair("token", &self.api_key.unwrap())
                .append_pair("max_speakers", &self.max_speakers.unwrap_or(2).to_string());

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

    fn to_audio_input(data: bytes::Bytes) -> Self::Input {
        DiarizeInputChunk {
            audio: data.to_vec(),
        }
    }

    fn to_flush_input() -> Self::Input {
        DiarizeInputChunk { audio: Vec::new() }
    }

    fn to_message(input: Self::Input) -> Message {
        Message::Text(serde_json::to_string(&input).unwrap().into())
    }

    fn from_message(msg: Message) -> Option<Self::Output> {
        match msg {
            Message::Text(text) => serde_json::from_str::<Self::Output>(&text).ok(),
            _ => None,
        }
    }
}

#[derive(Debug, Default, Clone, serde::Serialize)]
pub struct DiarizeInputChunk {
    #[serde(serialize_with = "serde_bytes::serialize")]
    pub audio: Vec<u8>,
}

pub type DiarizeOutputChunk = hypr_listener_interface::DiarizationChunk;

impl DiarizeClient {
    pub fn builder() -> DiarizeClientBuilder {
        DiarizeClientBuilder::default()
    }

    pub async fn from_audio<S, E>(
        &self,
        stream: S,
    ) -> Result<impl Stream<Item = DiarizeOutputChunk>, hypr_ws::Error>
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
        let audio_stream = stream_from_bytes(hypr_data::english_2::AUDIO);
        let mut out = std::fs::File::create(hypr_data::english_2::DIARIZATION_PATH).unwrap();

        let client = DiarizeClient::builder()
            .api_base("https://fastrepl--hyprnote-diart-server-serve.modal.run")
            .api_key("TODO")
            .sample_rate(16000)
            .build();

        let mut diarize_stream = Box::pin(client.from_audio(audio_stream).await.unwrap());

        let mut acc: Vec<DiarizeOutputChunk> = vec![];
        while let Some(data) = diarize_stream.next().await {
            println!("{:?}", data);
            acc.push(data);
        }

        serde_json::to_writer(&mut out, &acc).unwrap();
    }
}
