use bytes::Bytes;

use axum::{
    body::Body,
    extract::ws::{Message, WebSocket},
    http::{Response, StatusCode},
};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;

use deepgram::{
    common::{
        audio_source::AudioSource,
        options::{Encoding, Language, Model, Options},
    },
    Deepgram,
};

use hypr_transcribe_interface::{async_trait, TranscribeHandler};
use owhisper_interface::ListenParams;

#[derive(Clone)]
pub struct Handler {
    deepgram: Deepgram,
}

impl Handler {
    pub async fn new(config: owhisper_config::DeepgramModelConfig) -> Result<Self, crate::Error> {
        let api_key = config.api_key.unwrap_or_default();
        let base_url = config
            .base_url
            .unwrap_or("https://api.deepgram.com/v1".to_string())
            .parse::<url::Url>()
            .unwrap();

        let deepgram = Deepgram::with_base_url_and_api_key(base_url, api_key)?;
        Ok(Self { deepgram })
    }
}

#[async_trait]
impl TranscribeHandler for Handler {
    type Error = crate::Error;

    async fn handle_socket(self, socket: WebSocket, params: Option<ListenParams>) {
        let (mut sender, receiver) = socket.split();

        let _params = params.unwrap_or_default();

        let options_builder = Options::builder()
            .model(Model::Nova2)
            .punctuate(true)
            .smart_format(true)
            .language(Language::en)
            .encoding(Encoding::Linear16);

        let options = options_builder.build();

        let (audio_tx, audio_rx) = mpsc::channel::<Result<bytes::Bytes, std::io::Error>>(100);

        let audio_task = tokio::spawn(process_websocket_audio(receiver, audio_tx));

        let audio_stream = tokio_stream::wrappers::ReceiverStream::new(audio_rx);

        match self
            .deepgram
            .transcription()
            .stream_request_with_options(options)
            .stream(audio_stream)
            .await
        {
            Ok(mut deepgram_stream) => {
                while let Some(result) = deepgram_stream.next().await {
                    if let Ok(json) = serde_json::to_string(&result.unwrap()) {
                        if sender.send(Message::Text(json.into())).await.is_err() {
                            break;
                        }
                    }
                }
            }
            Err(e) => {
                tracing::error!("Failed to start Deepgram stream: {:?}", e);
            }
        }

        // Clean up
        audio_task.abort();
        let _ = sender.close().await;
    }

    async fn handle_batch_transcription(
        self,
        audio_data: Bytes,
    ) -> Result<Response<Body>, StatusCode> {
        let audio_source = AudioSource::from_buffer(audio_data.to_vec());

        let options = Options::builder()
            .model(Model::Nova2)
            .punctuate(true)
            .build();

        match self
            .deepgram
            .transcription()
            .prerecorded(audio_source, &options)
            .await
        {
            Ok(response) => {
                let json_response = serde_json::to_string(&response)
                    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

                Ok(Response::builder()
                    .status(StatusCode::OK)
                    .header("Content-Type", "application/json")
                    .body(Body::from(json_response))
                    .unwrap())
            }
            Err(e) => {
                eprintln!("Deepgram transcription error: {:?}", e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

async fn process_websocket_audio(
    mut receiver: futures_util::stream::SplitStream<WebSocket>,
    audio_tx: mpsc::Sender<Result<bytes::Bytes, std::io::Error>>,
) {
    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Binary(data) => {
                if audio_tx.send(Ok(data.into())).await.is_err() {
                    break;
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }
}
