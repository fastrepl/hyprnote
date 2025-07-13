use axum::extract::ws::{Message, WebSocket};
use futures_util::{stream::SplitStream, Stream, StreamExt};
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver};

use hypr_audio_utils::bytes_to_f32_samples;
use hypr_listener_interface::ListenInputChunk;

enum AudioProcessResult {
    Samples(Vec<f32>),
    DualSamples { mic: Vec<f32>, speaker: Vec<f32> },
    Empty,
    End,
}

fn process_ws_message(message: Message) -> AudioProcessResult {
    match message {
        Message::Text(data) => match serde_json::from_str::<ListenInputChunk>(&data) {
            Ok(ListenInputChunk::Audio { data }) => {
                if data.is_empty() {
                    AudioProcessResult::Empty
                } else {
                    AudioProcessResult::Samples(bytes_to_f32_samples(&data))
                }
            }
            Ok(ListenInputChunk::DualAudio { mic, speaker }) => AudioProcessResult::DualSamples {
                mic: bytes_to_f32_samples(&mic),
                speaker: bytes_to_f32_samples(&speaker),
            },
            Ok(ListenInputChunk::End) => AudioProcessResult::End,
            Err(_) => AudioProcessResult::Empty,
        },
        Message::Close(_) => AudioProcessResult::End,
        _ => AudioProcessResult::Empty,
    }
}

fn mix_audio_channels(mic: &[f32], speaker: &[f32]) -> Vec<f32> {
    let max_len = mic.len().max(speaker.len());
    (0..max_len)
        .map(|i| {
            let mic_sample = mic.get(i).copied().unwrap_or(0.0);
            let speaker_sample = speaker.get(i).copied().unwrap_or(0.0);
            (mic_sample + speaker_sample).clamp(-1.0, 1.0)
        })
        .collect()
}

pub struct WebSocketAudioSource {
    receiver: Option<SplitStream<WebSocket>>,
    sample_rate: u32,
}

impl WebSocketAudioSource {
    pub fn new(receiver: SplitStream<WebSocket>, sample_rate: u32) -> Self {
        Self {
            receiver: Some(receiver),
            sample_rate,
        }
    }
}

impl kalosm_sound::AsyncSource for WebSocketAudioSource {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        let receiver = self.receiver.as_mut().unwrap();

        futures_util::stream::unfold(receiver, |receiver| async move {
            match receiver.next().await {
                Some(Ok(message)) => match process_ws_message(message) {
                    AudioProcessResult::Samples(samples) => Some((samples, receiver)),
                    AudioProcessResult::DualSamples { mic, speaker } => {
                        let mixed = mix_audio_channels(&mic, &speaker);
                        Some((mixed, receiver))
                    }
                    AudioProcessResult::Empty => Some((Vec::new(), receiver)),
                    AudioProcessResult::End => None,
                },
                Some(Err(_)) => None,
                None => None,
            }
        })
        .flat_map(futures_util::stream::iter)
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

pub struct ChannelAudioSource {
    receiver: Option<UnboundedReceiver<Vec<f32>>>,
    sample_rate: u32,
}

impl ChannelAudioSource {
    fn new(receiver: UnboundedReceiver<Vec<f32>>, sample_rate: u32) -> Self {
        Self {
            receiver: Some(receiver),
            sample_rate,
        }
    }
}

impl kalosm_sound::AsyncSource for ChannelAudioSource {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        let receiver = self.receiver.as_mut().unwrap();
        futures_util::stream::unfold(receiver, |receiver| async move {
            receiver.recv().await.map(|samples| (samples, receiver))
        })
        .flat_map(futures_util::stream::iter)
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

pub fn split_dual_audio_sources(
    mut ws_receiver: SplitStream<WebSocket>,
    sample_rate: u32,
) -> (ChannelAudioSource, ChannelAudioSource) {
    let (mic_tx, mic_rx) = unbounded_channel::<Vec<f32>>();
    let (speaker_tx, speaker_rx) = unbounded_channel::<Vec<f32>>();

    tokio::spawn(async move {
        while let Some(Ok(message)) = ws_receiver.next().await {
            match process_ws_message(message) {
                AudioProcessResult::Samples(samples) => {
                    let _ = mic_tx.send(samples.clone());
                    let _ = speaker_tx.send(samples);
                }
                AudioProcessResult::DualSamples { mic, speaker } => {
                    let _ = mic_tx.send(mic);
                    let _ = speaker_tx.send(speaker);
                }
                AudioProcessResult::End => break,
                AudioProcessResult::Empty => continue,
            }
        }
    });

    (
        ChannelAudioSource::new(mic_rx, sample_rate),
        ChannelAudioSource::new(speaker_rx, sample_rate),
    )
}
