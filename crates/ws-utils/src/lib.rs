mod manager;
pub use manager::*;

use std::pin::Pin;
use std::task::{Context, Poll};

use axum::extract::ws::{Message, WebSocket};
use futures_util::{stream::SplitStream, Stream, StreamExt};
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver};

use hypr_audio_utils::bytes_to_f32_samples;
use owhisper_interface::ListenInputChunk;

enum AudioProcessResult {
    Samples(Vec<f32>),
    DualSamples { mic: Vec<f32>, speaker: Vec<f32> },
    Empty,
    End,
}

fn deinterleave_audio(data: &[u8]) -> (Vec<f32>, Vec<f32>) {
    let samples: Vec<i16> = data
        .chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
        .collect();

    let mut mic = Vec::with_capacity(samples.len() / 2);
    let mut speaker = Vec::with_capacity(samples.len() / 2);

    for chunk in samples.chunks_exact(2) {
        mic.push(chunk[0] as f32 / 32768.0);
        speaker.push(chunk[1] as f32 / 32768.0);
    }

    (mic, speaker)
}

fn process_ws_message(message: Message, channels: Option<u32>) -> AudioProcessResult {
    match message {
        Message::Binary(data) => {
            if data.is_empty() {
                return AudioProcessResult::Empty;
            }

            match channels {
                Some(2) => {
                    let (mic, speaker) = deinterleave_audio(&data);
                    AudioProcessResult::DualSamples { mic, speaker }
                }
                _ => AudioProcessResult::Samples(bytes_to_f32_samples(&data)),
            }
        }
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
    buffer: Vec<f32>,
    buffer_idx: usize,
}

impl WebSocketAudioSource {
    pub fn new(receiver: SplitStream<WebSocket>, sample_rate: u32) -> Self {
        Self {
            receiver: Some(receiver),
            sample_rate,
            buffer: Vec::new(),
            buffer_idx: 0,
        }
    }
}

impl Stream for WebSocketAudioSource {
    type Item = f32;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        loop {
            if self.buffer_idx < self.buffer.len() {
                let sample = self.buffer[self.buffer_idx];
                self.buffer_idx += 1;
                return Poll::Ready(Some(sample));
            }

            self.buffer.clear();
            self.buffer_idx = 0;

            let Some(receiver) = self.receiver.as_mut() else {
                return Poll::Ready(None);
            };

            match Pin::new(receiver).poll_next(cx) {
                Poll::Ready(Some(Ok(message))) => match process_ws_message(message, None) {
                    AudioProcessResult::Samples(mut samples) => {
                        if samples.is_empty() {
                            continue;
                        }
                        self.buffer.append(&mut samples);
                        self.buffer_idx = 0;
                    }
                    AudioProcessResult::DualSamples { mic, speaker } => {
                        let mut mixed = mix_audio_channels(&mic, &speaker);
                        if mixed.is_empty() {
                            continue;
                        }
                        self.buffer.append(&mut mixed);
                        self.buffer_idx = 0;
                    }
                    AudioProcessResult::Empty => continue,
                    AudioProcessResult::End => return Poll::Ready(None),
                },
                Poll::Ready(Some(Err(_))) => return Poll::Ready(None),
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}

impl kalosm_sound::AsyncSource for WebSocketAudioSource {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

pub struct ChannelAudioSource {
    receiver: Option<UnboundedReceiver<Vec<f32>>>,
    sample_rate: u32,
    buffer: Vec<f32>,
    buffer_idx: usize,
}

impl ChannelAudioSource {
    fn new(receiver: UnboundedReceiver<Vec<f32>>, sample_rate: u32) -> Self {
        Self {
            receiver: Some(receiver),
            sample_rate,
            buffer: Vec::new(),
            buffer_idx: 0,
        }
    }
}

impl Stream for ChannelAudioSource {
    type Item = f32;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        loop {
            if self.buffer_idx < self.buffer.len() {
                let sample = self.buffer[self.buffer_idx];
                self.buffer_idx += 1;
                return Poll::Ready(Some(sample));
            }

            self.buffer.clear();
            self.buffer_idx = 0;

            let Some(receiver) = self.receiver.as_mut() else {
                return Poll::Ready(None);
            };

            match receiver.poll_recv(cx) {
                Poll::Ready(Some(mut samples)) => {
                    if samples.is_empty() {
                        continue;
                    }
                    self.buffer.append(&mut samples);
                    self.buffer_idx = 0;
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}

impl kalosm_sound::AsyncSource for ChannelAudioSource {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
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
            match process_ws_message(message, Some(2)) {
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
