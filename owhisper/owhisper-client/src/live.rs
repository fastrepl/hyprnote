use std::time::Duration;

use futures_util::Stream;

use hypr_ws::client::{ClientRequestBuilder, Message, WebSocketClient, WebSocketIO};
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{ControlMessage, MixedMessage};

use crate::ListenClientBuilder;

pub type ListenClientInput = MixedMessage<bytes::Bytes, ControlMessage>;
pub type ListenClientDualInput = MixedMessage<(bytes::Bytes, bytes::Bytes), ControlMessage>;

#[derive(Clone)]
pub struct ListenClient {
    pub(crate) request: ClientRequestBuilder,
}

#[derive(Clone)]
pub struct ListenClientDual {
    pub(crate) request: ClientRequestBuilder,
}

fn interleave_audio(mic: &[u8], speaker: &[u8]) -> Vec<u8> {
    let mic_samples: Vec<i16> = mic
        .chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
        .collect();
    let speaker_samples: Vec<i16> = speaker
        .chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
        .collect();

    let max_len = mic_samples.len().max(speaker_samples.len());
    let mut interleaved = Vec::with_capacity(max_len * 2 * 2);

    for i in 0..max_len {
        let mic_sample = mic_samples.get(i).copied().unwrap_or(0);
        let speaker_sample = speaker_samples.get(i).copied().unwrap_or(0);
        interleaved.extend_from_slice(&mic_sample.to_le_bytes());
        interleaved.extend_from_slice(&speaker_sample.to_le_bytes());
    }

    interleaved
}

impl WebSocketIO for ListenClient {
    type Data = ListenClientInput;
    type Input = ListenClientInput;
    type Output = StreamResponse;

    fn to_input(data: Self::Data) -> Self::Input {
        data
    }

    fn to_message(input: Self::Input) -> Message {
        match input {
            MixedMessage::Audio(data) => Message::Binary(data),
            MixedMessage::Control(control) => {
                Message::Text(serde_json::to_string(&control).unwrap().into())
            }
        }
    }

    fn from_message(msg: Message) -> Option<Self::Output> {
        match msg {
            Message::Text(text) => serde_json::from_str::<Self::Output>(&text).ok(),
            _ => None,
        }
    }
}

impl WebSocketIO for ListenClientDual {
    type Data = ListenClientDualInput;
    type Input = ListenClientInput;
    type Output = StreamResponse;

    fn to_input(data: Self::Data) -> Self::Input {
        match data {
            ListenClientDualInput::Audio((mic, speaker)) => {
                let interleaved = interleave_audio(&mic, &speaker);
                ListenClientInput::Audio(interleaved.into())
            }
            ListenClientDualInput::Control(control) => ListenClientInput::Control(control),
        }
    }

    fn to_message(input: Self::Input) -> Message {
        match input {
            ListenClientInput::Audio(data) => Message::Binary(data),
            ListenClientInput::Control(control) => {
                Message::Text(serde_json::to_string(&control).unwrap().into())
            }
        }
    }

    fn from_message(msg: Message) -> Option<Self::Output> {
        match msg {
            Message::Text(text) => serde_json::from_str::<Self::Output>(&text).ok(),
            _ => None,
        }
    }
}

impl ListenClient {
    pub fn builder() -> ListenClientBuilder {
        ListenClientBuilder::default()
    }

    pub async fn from_realtime_audio(
        self,
        audio_stream: impl Stream<Item = ListenClientInput> + Send + Unpin + 'static,
    ) -> Result<
        (
            impl Stream<Item = Result<StreamResponse, hypr_ws::Error>>,
            hypr_ws::client::WebSocketHandle,
        ),
        hypr_ws::Error,
    > {
        let ws = websocket_client_with_keep_alive(&self.request);
        ws.from_audio::<Self>(audio_stream).await
    }
}

impl ListenClientDual {
    pub async fn from_realtime_audio(
        self,
        stream: impl Stream<Item = ListenClientDualInput> + Send + Unpin + 'static,
    ) -> Result<
        (
            impl Stream<Item = Result<StreamResponse, hypr_ws::Error>>,
            hypr_ws::client::WebSocketHandle,
        ),
        hypr_ws::Error,
    > {
        let ws = websocket_client_with_keep_alive(&self.request);
        ws.from_audio::<Self>(stream).await
    }
}

fn websocket_client_with_keep_alive(request: &ClientRequestBuilder) -> WebSocketClient {
    WebSocketClient::new(request.clone())
        .with_keep_alive_message(Duration::from_secs(5), keep_alive_message())
}

fn keep_alive_message() -> Message {
    Message::Text(
        serde_json::to_string(&ControlMessage::KeepAlive)
            .unwrap()
            .into(),
    )
}
