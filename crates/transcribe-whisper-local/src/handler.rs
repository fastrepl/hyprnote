use std::{path::PathBuf, time::Duration};

use axum::{
    body::Body,
    extract::ws::{Message, WebSocket},
    http::{Response, StatusCode},
};
use bytes::Bytes;
use futures_util::{SinkExt, StreamExt};

use hypr_chunker::VadExt;
use hypr_transcribe_interface::{async_trait, TranscribeHandler};
use owhisper_interface::{
    Alternatives, Channel, ListenParams, Metadata, ModelInfo, StreamResponse, Word, Word2,
};

use crate::manager::{ConnectionGuard, ConnectionManager};

#[derive(Clone)]
pub struct Handler {
    model_path: PathBuf,
    connection_manager: ConnectionManager,
}

impl Handler {
    pub fn new(model_path: PathBuf) -> Self {
        Self {
            model_path,
            connection_manager: ConnectionManager::default(),
        }
    }
}

#[async_trait]
impl TranscribeHandler for Handler {
    type Error = crate::Error;

    async fn handle_socket(self, socket: WebSocket, params: Option<ListenParams>) {
        let params = params.unwrap_or_default();
        let guard = self.connection_manager.acquire_connection();

        handle_websocket_connection(socket, params, self.model_path, guard).await;
    }

    async fn handle_batch_transcription(
        self,
        audio_data: Bytes,
    ) -> Result<Response<Body>, StatusCode> {
        // For now, we'll need to save the audio data to a temporary file
        // In the future, we could improve this to work directly with bytes
        let temp_dir = std::env::temp_dir();
        let temp_file = temp_dir.join(format!("whisper_temp_{}.wav", uuid::Uuid::new_v4()));

        // Save audio data to file
        if let Err(_) = tokio::fs::write(&temp_file, &audio_data).await {
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }

        // Process the recorded audio
        let result = match crate::service::process_recorded(&self.model_path, &temp_file) {
            Ok(words) => words,
            Err(_) => {
                // Clean up temp file
                let _ = tokio::fs::remove_file(&temp_file).await;
                return Err(StatusCode::INTERNAL_SERVER_ERROR);
            }
        };

        // Clean up temp file
        let _ = tokio::fs::remove_file(&temp_file).await;

        // Convert to response
        let response_body =
            serde_json::to_string(&result).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok(Response::builder()
            .status(StatusCode::OK)
            .header("Content-Type", "application/json")
            .body(Body::from(response_body))
            .unwrap())
    }
}

async fn handle_websocket_connection(
    socket: WebSocket,
    params: ListenParams,
    model_path: PathBuf,
    guard: ConnectionGuard,
) {
    let (ws_sender, ws_receiver) = socket.split();

    let model = match hypr_whisper_local::Whisper::builder()
        .model_path(model_path.to_str().unwrap())
        .languages(params.language.map(|l| vec![l]).unwrap_or_default())
        .static_prompt(params.keywords.as_deref().unwrap_or(""))
        .dynamic_prompt("")
        .build_async()
        .await
    {
        Ok(model) => model,
        Err(e) => {
            tracing::error!("failed to build model: {}", e);
            return;
        }
    };

    let enable_vad = params.enable_vad.unwrap_or(true);

    let redemption_time = params
        .vad_redemption_time
        .and_then(|ms| {
            if ms > 0 {
                Some(Duration::from_millis(ms as u64))
            } else {
                None
            }
        })
        .unwrap_or(Duration::from_millis(200));

    match params.channels {
        Some(2) => handle_dual_channel(ws_sender, ws_receiver, model, guard, redemption_time).await,
        _ => handle_single_channel(ws_sender, ws_receiver, model, guard, redemption_time).await,
    }
}

async fn handle_single_channel(
    ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    ws_receiver: futures_util::stream::SplitStream<WebSocket>,
    model: hypr_whisper_local::Whisper,
    guard: ConnectionGuard,
    redemption_time: Duration,
) {
    let ws_source = hypr_ws_utils::WebSocketAudioSource::new(ws_receiver, false, None);
    let stream = process_vad_stream(ws_source, "channel").transcribe(model, redemption_time);

    process_transcription_stream(ws_sender, stream, guard).await;
}

async fn handle_dual_channel(
    ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    ws_receiver: futures_util::stream::SplitStream<WebSocket>,
    model: hypr_whisper_local::Whisper,
    guard: ConnectionGuard,
    redemption_time: Duration,
) {
    let (mic_source, speaker_source) =
        hypr_ws_utils::split_interleaved_stereo_sources(ws_receiver, false, 1, 0);

    let mic_stream = process_vad_stream(mic_source, "mic");
    let speaker_stream = process_vad_stream(speaker_source, "speaker");

    let merged_stream = hypr_audio_utils::merge_audio_streams(mic_stream, speaker_stream);

    let transcription_stream = merged_stream.transcribe(model, redemption_time);

    process_transcription_stream(ws_sender, transcription_stream, guard).await;
}

async fn process_transcription_stream(
    mut ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    mut stream: impl futures_util::Stream<Item = hypr_whisper_local::Segment> + Unpin,
    guard: ConnectionGuard,
) {
    while let Some(segment) = stream.next().await {
        let response = segment_to_stream_response(segment);
        let message = serde_json::to_string(&response).unwrap();

        if let Err(e) = ws_sender.send(Message::Text(message)).await {
            tracing::error!("failed to send response: {}", e);
            break;
        }
    }

    // Send final message
    let final_response = StreamResponse {
        model_info: ModelInfo {
            name: "whisper".to_string(),
            ..Default::default()
        },
        metadata: Metadata::default(),
        is_final: true,
        ..Default::default()
    };

    let _ = ws_sender
        .send(Message::Text(
            serde_json::to_string(&final_response).unwrap(),
        ))
        .await;

    drop(guard);
}

fn segment_to_stream_response(segment: hypr_whisper_local::Segment) -> StreamResponse {
    let mut words = Vec::new();

    for word in segment.words() {
        words.push(Word {
            word: word.text().to_string(),
            start: word.start() as f32,
            end: word.end() as f32,
            confidence: word.confidence(),
            speaker: None,
            speaker_confidence: None,
            punctuated_word: None,
        });
    }

    let channel_index = match segment.source_name() {
        "mic" => 0,
        "speaker" => 1,
        _ => 0,
    };

    StreamResponse {
        model_info: ModelInfo {
            name: "whisper".to_string(),
            version: Some("1.0".to_string()),
            arch: Some("local".to_string()),
            ..Default::default()
        },
        metadata: Metadata {
            request_id: segment.id().to_string().into(),
            model_uuid: Some("whisper-local".to_string()),
            ..Default::default()
        },
        type_: "Results".to_string(),
        channel: Channel {
            alternatives: vec![Alternatives {
                transcript: segment.text().to_string(),
                confidence: segment.confidence(),
                words,
                languages: None,
                paragraphs: None,
                topics: None,
                entities: None,
                summaries: None,
                sentiments: None,
                intents: None,
                sentiment_scores: None,
            }],
        },
        duration: segment.duration() as f32,
        start: segment.start() as f32,
        is_final: false,
        speech_final: false,
        channel_index: vec![channel_index],
        diarize_output: vec![],
        utts_output: vec![],
    }
}

fn process_vad_stream<S>(
    stream: S,
    source_name: &str,
) -> impl futures_util::Stream<Item = hypr_whisper_local::SimpleAudioChunk>
where
    S: futures_util::Stream<Item = Vec<f32>> + Unpin,
{
    use futures_util::StreamExt;

    let source_name = source_name.to_string();

    stream
        .vad(Some(0.05), None, Some(source_name.clone()))
        .filter_map(move |result| {
            let source_name = source_name.clone();
            async move {
                match result {
                    hypr_chunker::ChunkResult::SpeechStart { .. } => None,
                    hypr_chunker::ChunkResult::SpeechEnd { chunk, .. } => {
                        Some(hypr_whisper_local::SimpleAudioChunk {
                            samples: chunk.samples,
                            source_name,
                        })
                    }
                }
            }
        })
}
