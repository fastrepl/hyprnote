use axum::extract::ws::{Message, WebSocket};

use futures_util::{stream::SplitStream, Stream, StreamExt};
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
                                let samples: Vec<f32> = data
                                    .chunks_exact(2)
                                    .map(|chunk| {
                                        let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
                                        sample as f32 / 32767.0
                                    })
                                    .collect();

                                Some((samples, receiver))
                            }
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
