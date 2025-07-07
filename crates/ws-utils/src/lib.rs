use axum::extract::ws::{Message, WebSocket};
use futures_util::{stream::SplitStream, Stream, StreamExt};
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver};

use hypr_audio_utils::bytes_to_f32_samples;
use hypr_listener_interface::ListenInputChunk;

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
            let item = receiver.next().await;

            match item {
                Some(Ok(Message::Text(data))) => {
                    let input: ListenInputChunk = serde_json::from_str(&data).unwrap();

                    match input {
                        ListenInputChunk::Audio { data } => {
                            if data.is_empty() {
                                None
                            } else {
                                let samples: Vec<f32> = bytes_to_f32_samples(&data);

                                Some((samples, receiver))
                            }
                        }
                        ListenInputChunk::DualAudio { mic, speaker } => {
                            let mic_samples: Vec<f32> = bytes_to_f32_samples(&mic);
                            let speaker_samples: Vec<f32> = bytes_to_f32_samples(&speaker);

                            let max_len = mic_samples.len().max(speaker_samples.len());
                            let mixed_samples: Vec<f32> = (0..max_len)
                                .map(|i| {
                                    let mic = mic_samples.get(i).copied().unwrap_or(0.0);
                                    let speaker = speaker_samples.get(i).copied().unwrap_or(0.0);
                                    (mic + speaker).clamp(-1.0, 1.0)
                                })
                                .collect();

                            Some((mixed_samples, receiver))
                        }
                        ListenInputChunk::End => None,
                    }
                }
                Some(Ok(Message::Close(_))) => None,
                Some(Err(_)) => None,
                _ => Some((Vec::new(), receiver)),
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
            match receiver.recv().await {
                Some(samples) => Some((samples, receiver)),
                None => None,
            }
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
        while let Some(item) = ws_receiver.next().await {
            match item {
                Ok(Message::Text(data)) => match serde_json::from_str::<ListenInputChunk>(&data) {
                    Ok(ListenInputChunk::Audio { data }) => {
                        let samples = bytes_to_f32_samples(&data);
                        let _ = mic_tx.send(samples.clone());
                        let _ = speaker_tx.send(samples);
                    }
                    Ok(ListenInputChunk::DualAudio { mic, speaker }) => {
                        let _ = mic_tx.send(bytes_to_f32_samples(&mic));
                        let _ = speaker_tx.send(bytes_to_f32_samples(&speaker));
                    }
                    Ok(ListenInputChunk::End) => break,
                    Err(_) => {}
                },
                Ok(Message::Close(_)) | Err(_) => break,
                _ => {}
            }
        }
    });

    (
        ChannelAudioSource::new(mic_rx, sample_rate),
        ChannelAudioSource::new(speaker_rx, sample_rate),
    )
}
