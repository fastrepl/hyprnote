use axum::extract::ws::{Message, WebSocket};
use futures_util::{stream::SplitStream, Stream, StreamExt};
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver};

use hypr_audio_utils::bytes_to_f32_samples;

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
                Some(Ok(message)) => match message {
                    Message::Binary(data) => Some((bytes_to_f32_samples(&data), receiver)),
                    Message::Close(_) => None,
                    _ => Some((Vec::new(), receiver)),
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
    pub fn new(receiver: UnboundedReceiver<Vec<f32>>, sample_rate: u32) -> Self {
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

pub fn split_interleaved_stereo_sources(
    mut ws_receiver: SplitStream<WebSocket>,
    sample_rate: u32,
) -> (ChannelAudioSource, ChannelAudioSource) {
    let (mic_tx, mic_rx) = unbounded_channel::<Vec<f32>>();
    let (speaker_tx, speaker_rx) = unbounded_channel::<Vec<f32>>();

    tokio::spawn(async move {
        while let Some(Ok(message)) = ws_receiver.next().await {
            match message {
                Message::Binary(data) => {
                    // Convert interleaved i16 stereo bytes to separate f32 channels
                    let mut mic_samples = Vec::new();
                    let mut speaker_samples = Vec::new();

                    // Process 4 bytes at a time (2 bytes for mic, 2 bytes for speaker)
                    let chunks = data.chunks_exact(4);
                    let remainder = chunks.remainder();

                    if !remainder.is_empty() {
                        // TODO: Add logging
                        // tracing::warn!(
                        //     "Dropping {} bytes from interleaved audio (not multiple of 4)",
                        //     remainder.len()
                        // );
                    }

                    for chunk in chunks {
                        // First 2 bytes: mic sample (i16 little-endian)
                        let mic_i16 = i16::from_le_bytes([chunk[0], chunk[1]]);
                        mic_samples.push(mic_i16 as f32 / 32768.0);

                        // Next 2 bytes: speaker sample (i16 little-endian)
                        let speaker_i16 = i16::from_le_bytes([chunk[2], chunk[3]]);
                        speaker_samples.push(speaker_i16 as f32 / 32768.0);
                    }

                    let _ = mic_tx.send(mic_samples);
                    let _ = speaker_tx.send(speaker_samples);
                }
                Message::Close(_) => break,
                _ => continue,
            }
        }
    });

    (
        ChannelAudioSource::new(mic_rx, sample_rate),
        ChannelAudioSource::new(speaker_rx, sample_rate),
    )
}

pub fn split_dual_audio_sources(
    mut ws_receiver: SplitStream<WebSocket>,
    sample_rate: u32,
) -> (ChannelAudioSource, ChannelAudioSource) {
    let (mic_tx, mic_rx) = unbounded_channel::<Vec<f32>>();
    let (speaker_tx, speaker_rx) = unbounded_channel::<Vec<f32>>();

    tokio::spawn(async move {
        while let Some(Ok(message)) = ws_receiver.next().await {
            match message {
                Message::Binary(data) => {
                    let samples = bytes_to_f32_samples(&data);

                    let (mic_samples, speaker_samples) = samples
                        .chunks_exact(2)
                        .map(|chunk| (chunk[0], chunk[1]))
                        .unzip();

                    let _ = mic_tx.send(mic_samples);
                    let _ = speaker_tx.send(speaker_samples);
                }
                Message::Close(_) => break,
                _ => continue,
            }
        }
    });

    (
        ChannelAudioSource::new(mic_rx, sample_rate),
        ChannelAudioSource::new(speaker_rx, sample_rate),
    )
}
