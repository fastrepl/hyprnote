use std::{
    future::Future,
    pin::Pin,
    sync::{Arc, Mutex},
    task::{Context, Poll},
    time::Duration,
};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        FromRequestParts,
    },
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
};
use futures_util::{SinkExt, StreamExt};
use tower::Service;

use hypr_chunker::VadExt;
use hypr_moonshine::MoonshineOnnxModel;

use owhisper_config::MoonshineModelSize;
use owhisper_interface::{Alternatives, Channel, ListenParams, Metadata, StreamResponse, Word};

#[derive(Clone)]
pub struct TranscribeService {
    model_size: MoonshineModelSize,
    tokenizer_path: String,
    encoder_path: String,
    decoder_path: String,
}

impl TranscribeService {
    pub fn builder() -> TranscribeServiceBuilder {
        TranscribeServiceBuilder::default()
    }
}

#[derive(Default)]
pub struct TranscribeServiceBuilder {
    model_size: Option<MoonshineModelSize>,
    tokenizer_path: Option<String>,
    encoder_path: Option<String>,
    decoder_path: Option<String>,
}

impl TranscribeServiceBuilder {
    pub fn model_size(mut self, model_size: MoonshineModelSize) -> Self {
        self.model_size = Some(model_size);
        self
    }

    pub fn tokenizer_path(mut self, tokenizer_path: String) -> Self {
        self.tokenizer_path = Some(tokenizer_path);
        self
    }

    pub fn encoder_path(mut self, encoder_path: String) -> Self {
        self.encoder_path = Some(encoder_path);
        self
    }

    pub fn decoder_path(mut self, decoder_path: String) -> Self {
        self.decoder_path = Some(decoder_path);
        self
    }

    pub fn build(self) -> TranscribeService {
        TranscribeService {
            model_size: self.model_size.unwrap(),
            tokenizer_path: self.tokenizer_path.unwrap(),
            encoder_path: self.encoder_path.unwrap(),
            decoder_path: self.decoder_path.unwrap(),
        }
    }
}

impl<B> Service<Request<B>> for TranscribeService
where
    B: Send + 'static,
{
    type Response = Response;
    type Error = std::convert::Infallible;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<B>) -> Self::Future {
        let model_size = self.model_size.clone();
        let tokenizer_path = self.tokenizer_path.clone();
        let encoder_path = self.encoder_path.clone();
        let decoder_path = self.decoder_path.clone();

        Box::pin(async move {
            let uri = req.uri();
            let query_string = uri.query().unwrap_or("");

            let params: ListenParams = match serde_qs::from_str(query_string) {
                Ok(p) => p,
                Err(e) => {
                    return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                }
            };

            let (mut parts, _body) = req.into_parts();
            let ws_upgrade = match WebSocketUpgrade::from_request_parts(&mut parts, &()).await {
                Ok(ws) => ws,
                Err(e) => {
                    return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                }
            };

            Ok(ws_upgrade
                .on_upgrade(move |socket| async move {
                    handle_websocket_connection(
                        socket,
                        params,
                        model_size,
                        tokenizer_path,
                        encoder_path,
                        decoder_path,
                    )
                    .await
                })
                .into_response())
        })
    }
}

async fn handle_websocket_connection(
    socket: WebSocket,
    params: ListenParams,
    model_size: MoonshineModelSize,
    tokenizer_path: String,
    encoder_path: String,
    decoder_path: String,
) {
    let model =
        match MoonshineOnnxModel::new(encoder_path, decoder_path, tokenizer_path, model_size) {
            Ok(m) => Arc::new(Mutex::new(m)),
            Err(e) => {
                tracing::error!("Failed to create moonshine model: {}", e);
                return;
            }
        };

    let (ws_sender, ws_receiver) = socket.split();

    let redemption_time = Duration::from_millis(std::cmp::min(
        std::cmp::max(params.redemption_time_ms.unwrap_or(500), 300),
        1200,
    ));

    match params.channels {
        1 => {
            handle_single_channel(ws_sender, ws_receiver, model, redemption_time).await;
        }
        _ => {
            handle_dual_channel(ws_sender, ws_receiver, model, redemption_time).await;
        }
    }
}

async fn handle_single_channel(
    ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    ws_receiver: futures_util::stream::SplitStream<WebSocket>,
    model: Arc<Mutex<MoonshineOnnxModel>>,
    redemption_time: Duration,
) {
    let audio_source = hypr_ws_utils::WebSocketAudioSource::new(ws_receiver, 16 * 1000);
    let vad_chunks = audio_source.vad_chunks(redemption_time);

    let stream = process_vad_stream(vad_chunks, model, "mixed");
    let boxed_stream = Box::pin(stream);
    process_transcription_stream(ws_sender, boxed_stream).await;
}

async fn handle_dual_channel(
    ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    ws_receiver: futures_util::stream::SplitStream<WebSocket>,
    model: Arc<Mutex<MoonshineOnnxModel>>,
    redemption_time: Duration,
) {
    let (mic_source, speaker_source) =
        hypr_ws_utils::split_dual_audio_sources(ws_receiver, 16 * 1000);

    let mic_stream = {
        let mic_vad_chunks = mic_source.vad_chunks(redemption_time);
        process_vad_stream(mic_vad_chunks, model.clone(), "mic")
    };

    let speaker_stream = {
        let speaker_vad_chunks = speaker_source.vad_chunks(redemption_time);
        process_vad_stream(speaker_vad_chunks, model.clone(), "speaker")
    };

    let merged_stream = futures_util::stream::select(mic_stream, speaker_stream);
    let boxed_stream = Box::pin(merged_stream);
    process_transcription_stream(ws_sender, boxed_stream).await;
}

async fn process_transcription_stream(
    mut ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    mut stream: Pin<Box<dyn futures_util::Stream<Item = StreamResponse> + Send>>,
) {
    while let Some(response) = stream.next().await {
        let msg = Message::Text(serde_json::to_string(&response).unwrap().into());
        if let Err(e) = ws_sender.send(msg).await {
            tracing::warn!("websocket_send_error: {}", e);
            break;
        }
    }

    let _ = ws_sender.close().await;
}

fn process_vad_stream<S, E>(
    stream: S,
    model: Arc<Mutex<MoonshineOnnxModel>>,
    source_name: &str,
) -> impl futures_util::Stream<Item = StreamResponse>
where
    S: futures_util::Stream<Item = Result<hypr_chunker::AudioChunk, E>>,
    E: std::fmt::Display,
{
    let source_name = source_name.to_string();

    stream
        .take_while(move |chunk_result| {
            futures_util::future::ready(match chunk_result {
                Ok(_) => true,
                Err(e) => {
                    tracing::error!("vad_error_disconnecting: {}", e);
                    false
                }
            })
        })
        .filter_map(move |chunk_result| {
            let model = model.clone();
            let source_name = source_name.clone();

            async move {
                match chunk_result {
                    Err(_) => None,
                    Ok(chunk) => {
                        let text = {
                            let mut model_guard = model.lock().unwrap();
                            model_guard.transcribe(chunk.samples).unwrap()
                        };

                        let (speaker, channel_index) = match source_name.as_str() {
                            "mic" => (Some(0), vec![0]),
                            "speaker" => (Some(1), vec![1]),
                            _ => (None, vec![0]),
                        };

                        let start_f64 = 0.0;
                        let duration_f64 = 0.0;
                        let confidence = 1.0;

                        let words: Vec<Word> = text
                            .split_whitespace()
                            .filter(|w| !w.is_empty())
                            .map(|w| Word {
                                word: w.to_string(),
                                start: start_f64,
                                end: start_f64 + duration_f64,
                                confidence,
                                speaker: speaker.clone(),
                                punctuated_word: None,
                                language: None,
                            })
                            .collect();

                        let response = StreamResponse::TranscriptResponse {
                            type_field: "Results".to_string(),
                            start: start_f64,
                            duration: duration_f64,
                            is_final: true,
                            speech_final: true,
                            from_finalize: false,
                            channel: Channel {
                                alternatives: vec![Alternatives {
                                    transcript: text.clone(),
                                    languages: vec![],
                                    words,
                                    confidence,
                                }],
                            },
                            metadata: Metadata::default(),
                            channel_index,
                        };

                        Some(response)
                    }
                }
            }
        })
}
