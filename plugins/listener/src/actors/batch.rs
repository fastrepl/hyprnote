use bytes::Bytes;
use std::path::PathBuf;

use futures_util::StreamExt;
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{batch, ControlMessage, MixedMessage};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef};
use tauri_specta::Event;

use crate::SessionEvent;

const STREAM_CHUNK_SAMPLES: usize = 512;

pub enum BatchMsg {
    StreamResponse(StreamResponse),
    StreamError(String),
    StreamEnded,
    StreamStartFailed(String),
}

#[derive(Clone)]
pub struct BatchArgs {
    pub app: tauri::AppHandle,
    pub file_path: String,
    pub base_url: String,
    pub api_key: String,
    pub listen_params: owhisper_interface::ListenParams,
}

pub struct BatchState {
    pub app: tauri::AppHandle,
    pub accumulator: BatchResponseBuilder,
    rx_task: tokio::task::JoinHandle<()>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

pub struct BatchActor;

impl BatchActor {
    pub fn name() -> ActorName {
        "batch_actor".into()
    }
}

impl Actor for BatchActor {
    type Msg = BatchMsg;
    type State = BatchState;
    type Arguments = BatchArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let (rx_task, shutdown_tx) = spawn_batch_task(args.clone(), myself).await?;

        let accumulator = BatchResponseBuilder::new(1);

        let state = BatchState {
            app: args.app,
            accumulator,
            rx_task,
            shutdown_tx: Some(shutdown_tx),
        };

        Ok(state)
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        if let Some(shutdown_tx) = state.shutdown_tx.take() {
            let _ = shutdown_tx.send(());
            let _ = (&mut state.rx_task).await;
        }
        Ok(())
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            BatchMsg::StreamResponse(response) => {
                state.accumulator.ingest(response);
            }

            BatchMsg::StreamStartFailed(error) => {
                tracing::error!("batch_stream_start_failed: {}", error);
                myself.stop(Some(format!("batch_stream_start_failed: {}", error)));
            }

            BatchMsg::StreamError(error) => {
                tracing::error!("batch_stream_error: {}", error);
                myself.stop(None);
            }

            BatchMsg::StreamEnded => {
                tracing::info!("batch_stream_ended");

                let accumulator =
                    std::mem::replace(&mut state.accumulator, BatchResponseBuilder::new(1));
                let batch_response = accumulator.build();
                SessionEvent::BatchResponse {
                    response: batch_response,
                }
                .emit(&state.app)?;

                myself.stop(None);
            }
        }
        Ok(())
    }
}

async fn spawn_batch_task(
    args: BatchArgs,
    myself: ActorRef<BatchMsg>,
) -> Result<
    (
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let rx_task = tokio::spawn(async move {
        let audio_chunks = match load_audio_chunks(PathBuf::from(args.file_path)).await {
            Ok(chunks) => chunks,
            Err(e) => {
                let _ = myself.send_message(BatchMsg::StreamStartFailed(format!("{:?}", e)));
                return;
            }
        };

        let client = owhisper_client::ListenClient::builder()
            .api_base(args.base_url)
            .api_key(args.api_key)
            .params(args.listen_params)
            .build_single();

        let outbound = tokio_stream::iter(audio_chunks.into_iter().map(MixedMessage::Audio).chain(
            std::iter::once(MixedMessage::Control(ControlMessage::Finalize)),
        ));

        let (listen_stream, _handle) = match client.from_realtime_audio(Box::pin(outbound)).await {
            Ok(res) => res,
            Err(e) => {
                let _ = myself.send_message(BatchMsg::StreamStartFailed(format!("{:?}", e)));
                return;
            }
        };
        futures_util::pin_mut!(listen_stream);

        process_batch_stream(listen_stream, myself, shutdown_rx).await;
    });

    Ok((rx_task, shutdown_tx))
}

async fn process_batch_stream<S, E>(
    mut listen_stream: std::pin::Pin<&mut S>,
    myself: ActorRef<BatchMsg>,
    mut shutdown_rx: tokio::sync::oneshot::Receiver<()>,
) where
    S: futures_util::Stream<Item = Result<StreamResponse, E>>,
    E: std::fmt::Debug,
{
    loop {
        tokio::select! {
            _ = &mut shutdown_rx => {
                tracing::info!("batch_stream_shutdown");
                break;
            }
            result = listen_stream.next() => {
                match result {
                    Some(Ok(response)) => {
                        let _ = myself.send_message(BatchMsg::StreamResponse(response));
                    }
                    Some(Err(e)) => {
                        let _ = myself.send_message(BatchMsg::StreamError(format!("{:?}", e)));
                        break;
                    }
                    None => {
                        let _ = myself.send_message(BatchMsg::StreamEnded);
                        break;
                    }
                }
            }
        }
    }
}

async fn load_audio_chunks(path: PathBuf) -> Result<Vec<Bytes>, std::io::Error> {
    tokio::task::spawn_blocking(move || load_audio_chunks_sync(path))
        .await
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?
}

fn load_audio_chunks_sync(path: PathBuf) -> Result<Vec<Bytes>, std::io::Error> {
    let source = hypr_audio_utils::source_from_path(&path)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    let samples: Vec<f32> = hypr_audio_utils::resample_audio(source, 16_000)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    if samples.is_empty() {
        return Ok(Vec::new());
    }

    let mut chunks = Vec::new();
    let mut offset = 0;

    while offset < samples.len() {
        let end = (offset + STREAM_CHUNK_SAMPLES).min(samples.len());
        let bytes = hypr_audio_utils::f32_to_i16_bytes(samples[offset..end].iter().copied());
        chunks.push(bytes);
        offset = end;
    }

    Ok(chunks)
}

pub struct BatchResponseBuilder {
    metadata: Option<serde_json::Value>,
    channels: Vec<ChannelAccumulator>,
}

impl BatchResponseBuilder {
    fn new(channel_count: u8) -> Self {
        let count = channel_count.clamp(1, 2) as usize;
        let channels = (0..count).map(|_| ChannelAccumulator::default()).collect();
        Self {
            metadata: None,
            channels,
        }
    }

    fn ingest(&mut self, response: StreamResponse) {
        if let StreamResponse::TranscriptResponse {
            is_final,
            channel,
            metadata,
            channel_index,
            ..
        } = response
        {
            if !is_final {
                return;
            }

            if self.metadata.is_none() {
                self.metadata = serde_json::to_value(metadata).ok();
            }

            let target_index = channel_index
                .iter()
                .find_map(|idx| usize::try_from(*idx).ok())
                .unwrap_or(0);

            if let Some(accumulator) = self.channels.get_mut(target_index) {
                if let Some(alternative) = channel.alternatives.into_iter().next() {
                    accumulator.ingest(alternative);
                }
            }
        }
    }

    fn build(self) -> batch::Response {
        let metadata = self.metadata.unwrap_or_else(|| serde_json::json!({}));
        let channels = self
            .channels
            .into_iter()
            .map(|accumulator| accumulator.into_channel())
            .collect();

        batch::Response {
            metadata,
            results: batch::Results { channels },
        }
    }
}

#[derive(Default)]
struct ChannelAccumulator {
    transcript: String,
    words: Vec<batch::Word>,
    confidence: f64,
    has_content: bool,
}

impl ChannelAccumulator {
    fn ingest(&mut self, alternative: owhisper_interface::stream::Alternatives) {
        let transcript = alternative.transcript.trim();
        if !transcript.is_empty() {
            if !self.transcript.is_empty() {
                self.transcript.push(' ');
            }
            self.transcript.push_str(transcript);
        }

        for word in alternative.words {
            self.words.push(batch::Word {
                word: word.word,
                start: word.start,
                end: word.end,
                confidence: word.confidence,
                speaker: word
                    .speaker
                    .and_then(|speaker| (speaker >= 0).then_some(speaker as usize)),
                punctuated_word: word.punctuated_word,
            });
        }

        self.confidence = alternative.confidence;
        self.has_content = self.has_content || !transcript.is_empty() || !self.words.is_empty();
    }

    fn into_channel(self) -> batch::Channel {
        if !self.has_content {
            return batch::Channel {
                alternatives: Vec::new(),
            };
        }

        batch::Channel {
            alternatives: vec![batch::Alternatives {
                transcript: self.transcript,
                confidence: self.confidence,
                words: self.words,
            }],
        }
    }
}
