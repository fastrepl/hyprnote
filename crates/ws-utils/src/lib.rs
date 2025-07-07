use axum::extract::ws::{Message, WebSocket};
use futures_util::{stream::SplitStream, Stream, StreamExt};

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
