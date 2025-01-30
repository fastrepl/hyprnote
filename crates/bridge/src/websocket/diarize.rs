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
                .append_pair("sample_rate", &self.sample_rate.unwrap().to_string());

            url.to_string().parse().unwrap()
        };

        let request = ClientRequestBuilder::new(uri)
            .with_header("Authorization", format!("Bearer {}", self.api_key.unwrap()));

        DiarizeClient { request }
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
    use bytes::BufMut;
    use std::time::Duration;
    use tokio::time::timeout;

    #[ignore]
    #[tokio::test]
    async fn test_diarize() {
        let client = DiarizeClient::builder()
            .api_base("https://fastrepl--hyprnote-diart-main-dev.modal.run")
            .api_key("TODO")
            .sample_rate(16000)
            .build();

        let path = env!("CARGO_MANIFEST_DIR");
        let mut reader = hound::WavReader::open(format!("{}/data/audio.wav", path)).unwrap();

        let mut sample_stream = async_stream::stream! {
            for sample in reader.samples::<i16>() {
                yield sample.unwrap();
            }
        };

        let bytes_stream = Box::pin(sample_stream.chunks(1024).map(|chunk| {
            let mut buf = bytes::BytesMut::with_capacity(chunk.len() * 4);
            for sample in chunk {
                buf.put_i16_le(sample);
            }

            // TODO: current implementation close the connection once we send all
            std::thread::sleep(Duration::from_millis(100));

            Ok::<bytes::Bytes, std::io::Error>(buf.freeze())
        }));

        let mut results = Vec::<(u64, DiarizeOutputChunk)>::new();
        let started = std::time::Instant::now();

        let mut diarize_stream = Box::pin(client.from_audio(bytes_stream).await.unwrap());
        while let Some(item) = diarize_stream.next().await {
            results.push((started.elapsed().as_secs(), item));
        }

        println!("{:?}", results);
    }
}
