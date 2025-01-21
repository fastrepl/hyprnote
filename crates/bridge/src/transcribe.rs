// https://github.com/tokio-rs/axum/blob/main/examples/websockets/src/client.rs
// https://github.com/snapview/tokio-tungstenite/blob/master/examples/client.rs

use futures_util::{SinkExt, Stream, StreamExt};
use tokio_tungstenite::{
    connect_async,
    tungstenite::{client::IntoClientRequest, http::Uri, protocol::Message, ClientRequestBuilder},
};

use bytes::BufMut;
use kalosm_sound::AsyncSource;

use crate::{TranscribeInputChunk, TranscribeOutputChunk};

#[derive(Default)]
pub struct TranscribeClientBuilder {
    api_base: Option<url::Url>,
    api_key: Option<String>,
    language: Option<codes_iso_639::part_1::LanguageCode>,
}

#[derive(Debug, Clone)]
pub struct TranscribeClient {
    transcribe_request: ClientRequestBuilder,
}

impl TranscribeClientBuilder {
    pub fn api_base(mut self, api_base: url::Url) -> Self {
        self.api_base = Some(api_base);
        self
    }

    pub fn api_key(mut self, api_key: String) -> Self {
        self.api_key = Some(api_key);
        self
    }

    pub fn language(mut self, language: codes_iso_639::part_1::LanguageCode) -> Self {
        self.language = Some(language);
        self
    }

    pub fn build(self) -> TranscribeClient {
        let uri = {
            let mut url = self.api_base.unwrap();

            let language = self.language.unwrap().code();
            let language =
                language.chars().next().unwrap().to_uppercase().to_string() + &language[1..];

            url.set_path("/api/native/transcribe");
            url.query_pairs_mut().append_pair("language", &language);

            if cfg!(debug_assertions) {
                if url.port().is_none() {
                    url.set_port(Some(3000)).unwrap();
                }

                url.set_scheme("ws").unwrap();
                url.set_host(Some("localhost")).unwrap();
            } else {
                url.set_scheme("wss").unwrap();
                url.set_host(Some("app.hyprnote.com")).unwrap();
            }

            url.to_string().parse::<Uri>().unwrap()
        };

        let transcribe_request = ClientRequestBuilder::new(uri).with_header(
            reqwest::header::AUTHORIZATION.to_string(),
            format!("Bearer {}", self.api_key.unwrap()),
        );

        TranscribeClient { transcribe_request }
    }
}

impl TranscribeClient {
    pub fn builder() -> TranscribeClientBuilder {
        TranscribeClientBuilder::default()
    }

    pub async fn from_audio(
        &self,
        audio_stream: impl Stream<Item = f32> + Send + Unpin + 'static + AsyncSource,
    ) -> Result<impl Stream<Item = TranscribeOutputChunk>, crate::Error> {
        let req = self
            .transcribe_request
            .clone()
            .into_client_request()
            .unwrap();

        let (ws_stream, _) = connect_async(req).await?;
        let (mut ws_sender, mut ws_receiver) = ws_stream.split();
        let (done_tx, mut done_rx) = tokio::sync::oneshot::channel();

        let _send_task = tokio::spawn(async move {
            let mut audio_stream = audio_stream.resample(16 * 1000).chunks(1024).map(|chunk| {
                let mut buf = bytes::BytesMut::with_capacity(chunk.len() * 4);
                for sample in chunk {
                    let scaled = (sample * 32767.0).clamp(-32768.0, 32767.0);
                    buf.put_i16_le(scaled as i16);
                }
                buf.freeze()
            });

            while let Some(audio) = audio_stream.next().await {
                let input = TranscribeInputChunk {
                    audio: audio.to_vec(),
                };
                let msg = Message::Text(serde_json::to_string(&input).unwrap().into());
                if let Err(_) = ws_sender.send(msg).await {
                    break;
                }
            }

            let _ = ws_sender.send(Message::Close(None)).await;
            let _ = done_tx.send(());
        });

        let transcript_stream = async_stream::stream! {
            loop {
                tokio::select! {
                    _ = &mut done_rx => break,
                    msg = ws_receiver.next() => {
                        match msg {
                            Some(Ok(msg)) => {
                                match msg {
                                    Message::Text(data) => yield serde_json::from_str::<TranscribeOutputChunk>(&data).unwrap(),
                                    Message::Binary(_) => {},
                                    Message::Close(_) => break,
                                    Message::Ping(_) => {},
                                    Message::Pong(_) => {},
                                    Message::Frame(_) => {},
                                }
                            }
                            _ => break,
                        }
                    }
                }
            }
        };

        Ok(transcript_stream)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_channel::oneshot;
    use futures_util::{SinkExt, StreamExt};
    use std::net::{Ipv4Addr, SocketAddr};
    use tokio_tungstenite::accept_async;

    async fn setup_test_server() -> String {
        let (ready_tx, ready_rx) = oneshot::channel();

        let listener = tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::UNSPECIFIED, 0)))
            .await
            .unwrap();
        let addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            ready_tx.send(()).unwrap();

            let (stream, _) = listener.accept().await.unwrap();
            let ws_stream = accept_async(stream).await.unwrap();
            let (mut ws_sender, mut ws_receiver) = ws_stream.split();

            while let Some(Ok(msg)) = ws_receiver.next().await {
                if matches!(msg, Message::Close(_)) {
                    break;
                }

                let text = msg.into_text().unwrap();
                let input: TranscribeInputChunk = serde_json::from_str(text.as_str()).unwrap();

                let size = input.audio.len();
                let non_zero_count = input.audio.iter().filter(|b| **b != 0).count();
                let text = format!("Received {} bytes, {} non-zero", size, non_zero_count);

                let output = serde_json::to_string(&TranscribeOutputChunk { text }).unwrap();
                ws_sender.send(Message::Text(output.into())).await.unwrap();
            }
        });

        ready_rx.await.unwrap();
        format!("ws://{}", addr)
    }

    // cargo test test_transcribe -p bridge -- --ignored --nocapture
    #[tokio::test]
    #[ignore]
    async fn test_transcribe() {
        let server_url = setup_test_server().await;
        let client = crate::Client::builder()
            .api_base(&server_url)
            .api_key("test")
            .build()
            .unwrap();

        let transcribe_client = client
            .transcribe()
            .language(codes_iso_639::part_1::LanguageCode::En)
            .build();

        let source = hypr_audio::MicInput::default();
        let stream = source.stream().unwrap();

        let transcript_stream = transcribe_client.from_audio(stream).await.unwrap();
        futures_util::pin_mut!(transcript_stream);

        while let Some(chunk) = transcript_stream.next().await {
            println!("{:?}", chunk);
        }
    }
}
