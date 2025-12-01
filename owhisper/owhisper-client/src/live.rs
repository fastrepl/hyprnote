use std::marker::PhantomData;
use std::time::Duration;

use futures_util::Stream;

use hypr_ws::client::{ClientRequestBuilder, Message, WebSocketClient, WebSocketIO};
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{ControlMessage, MixedMessage};

use crate::adapter::SttAdapter;
use crate::{DeepgramAdapter, ListenClientBuilder};

pub type ListenClientInput = MixedMessage<bytes::Bytes, ControlMessage>;
pub type ListenClientDualInput = MixedMessage<(bytes::Bytes, bytes::Bytes), ControlMessage>;

/// A single-channel STT client.
///
/// This client is generic over the adapter type, which determines how to
/// communicate with the STT provider.
#[derive(Clone)]
pub struct ListenClient<A: SttAdapter = DeepgramAdapter> {
    pub(crate) adapter: A,
    pub(crate) request: ClientRequestBuilder,
}

/// A dual-channel STT client (mic + speaker).
///
/// This client is generic over the adapter type, which determines how to
/// communicate with the STT provider.
#[derive(Clone)]
pub struct ListenClientDual<A: SttAdapter = DeepgramAdapter> {
    pub(crate) adapter: A,
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

/// WebSocket IO wrapper for single-channel client.
///
/// This struct is used internally to implement the WebSocketIO trait
/// for the ListenClient, handling message encoding/decoding.
pub struct ListenClientIO<A: SttAdapter> {
    _marker: PhantomData<A>,
}

impl<A: SttAdapter> WebSocketIO for ListenClientIO<A> {
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

/// WebSocket IO wrapper for dual-channel client.
///
/// This struct is used internally to implement the WebSocketIO trait
/// for the ListenClientDual, handling message encoding/decoding and
/// audio interleaving.
pub struct ListenClientDualIO<A: SttAdapter> {
    _marker: PhantomData<A>,
}

impl<A: SttAdapter> WebSocketIO for ListenClientDualIO<A> {
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

impl ListenClient<DeepgramAdapter> {
    /// Create a new builder with the default Deepgram adapter.
    pub fn builder() -> ListenClientBuilder<DeepgramAdapter> {
        ListenClientBuilder::default()
    }
}

impl<A: SttAdapter> ListenClient<A> {
    /// Get a reference to the adapter.
    pub fn adapter(&self) -> &A {
        &self.adapter
    }

    /// Connect to the STT service and start streaming audio.
    ///
    /// Returns a stream of transcription responses and a handle to control the connection.
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
        let ws = websocket_client_with_keep_alive(&self.request, &self.adapter);
        ws.from_audio::<ListenClientIO<A>>(audio_stream).await
    }
}

impl<A: SttAdapter> ListenClientDual<A> {
    /// Get a reference to the adapter.
    pub fn adapter(&self) -> &A {
        &self.adapter
    }

    /// Connect to the STT service and start streaming dual-channel audio.
    ///
    /// Returns a stream of transcription responses and a handle to control the connection.
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
        let ws = websocket_client_with_keep_alive(&self.request, &self.adapter);
        ws.from_audio::<ListenClientDualIO<A>>(stream).await
    }
}

fn websocket_client_with_keep_alive<A: SttAdapter>(
    request: &ClientRequestBuilder,
    adapter: &A,
) -> WebSocketClient {
    let ws = WebSocketClient::new(request.clone());

    if let Some((interval, message)) = adapter.keep_alive_config() {
        ws.with_keep_alive_message(interval, message)
    } else {
        ws.with_keep_alive_message(Duration::from_secs(5), keep_alive_message())
    }
}

fn keep_alive_message() -> Message {
    Message::Text(
        serde_json::to_string(&ControlMessage::KeepAlive)
            .unwrap()
            .into(),
    )
}
