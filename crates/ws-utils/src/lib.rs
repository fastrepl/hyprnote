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
