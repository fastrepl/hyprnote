use std::pin::Pin;
use std::time::Duration;

use futures_util::{Stream, StreamExt};

use hypr_ws::client::{
    ClientRequestBuilder, Message, Utf8Bytes, WebSocketClient, WebSocketHandle, WebSocketIO,
};
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{ControlMessage, MixedMessage};

use crate::{ListenClientBuilder, SttAdapter};

pub type ListenClientInput = MixedMessage<bytes::Bytes, ControlMessage>;
pub type ListenClientDualInput = MixedMessage<(bytes::Bytes, bytes::Bytes), ControlMessage>;

#[derive(Clone)]
pub struct ListenClient {
    pub(crate) request: ClientRequestBuilder,
}

#[derive(Clone)]
pub struct ListenClientDual<A: SttAdapter> {
    pub(crate) adapter: A,
    pub(crate) request: ClientRequestBuilder,
}

pub enum DualHandle {
    Native(WebSocketHandle),
    Split {
        mic: WebSocketHandle,
        spk: WebSocketHandle,
    },
}

pub trait FinalizeHandle: Send {
    fn finalize_with_text(&self, text: Utf8Bytes) -> impl std::future::Future<Output = ()> + Send;
    fn expected_finalize_count(&self) -> usize;
}

impl FinalizeHandle for WebSocketHandle {
    async fn finalize_with_text(&self, text: Utf8Bytes) {
        self.finalize_with_text(text).await
    }

    fn expected_finalize_count(&self) -> usize {
        1
    }
}

impl FinalizeHandle for DualHandle {
    async fn finalize_with_text(&self, text: Utf8Bytes) {
        match self {
            DualHandle::Native(h) => h.finalize_with_text(text).await,
            DualHandle::Split { mic, spk } => {
                let text_clone = text.clone();
                tokio::join!(
                    WebSocketHandle::finalize_with_text(mic, text),
                    WebSocketHandle::finalize_with_text(spk, text_clone)
                );
            }
        }
    }

    fn expected_finalize_count(&self) -> usize {
        match self {
            DualHandle::Native(_) => 1,
            DualHandle::Split { .. } => 2,
        }
    }
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

pub struct ListenClientIO;

impl WebSocketIO for ListenClientIO {
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

pub struct ListenClientDualIO;

impl WebSocketIO for ListenClientDualIO {
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
        ws.from_audio::<ListenClientIO>(audio_stream).await
    }
}

type DualOutputStream = Pin<Box<dyn Stream<Item = Result<StreamResponse, hypr_ws::Error>> + Send>>;

impl<A: SttAdapter> ListenClientDual<A> {
    pub async fn from_realtime_audio(
        self,
        stream: impl Stream<Item = ListenClientDualInput> + Send + Unpin + 'static,
    ) -> Result<(DualOutputStream, DualHandle), hypr_ws::Error> {
        if self.adapter.supports_native_multichannel() {
            self.from_realtime_audio_native(stream).await
        } else {
            self.from_realtime_audio_split(stream).await
        }
    }

    async fn from_realtime_audio_native(
        self,
        stream: impl Stream<Item = ListenClientDualInput> + Send + Unpin + 'static,
    ) -> Result<(DualOutputStream, DualHandle), hypr_ws::Error> {
        let ws = websocket_client_with_keep_alive(&self.request);
        let (output_stream, handle) = ws.from_audio::<ListenClientDualIO>(stream).await?;
        Ok((Box::pin(output_stream), DualHandle::Native(handle)))
    }

    async fn from_realtime_audio_split(
        self,
        stream: impl Stream<Item = ListenClientDualInput> + Send + Unpin + 'static,
    ) -> Result<(DualOutputStream, DualHandle), hypr_ws::Error> {
        let (mic_tx, mic_rx) = tokio::sync::mpsc::channel::<ListenClientInput>(32);
        let (spk_tx, spk_rx) = tokio::sync::mpsc::channel::<ListenClientInput>(32);

        let mic_ws = websocket_client_with_keep_alive(&self.request);
        let spk_ws = websocket_client_with_keep_alive(&self.request);

        let mic_outbound = tokio_stream::wrappers::ReceiverStream::new(mic_rx);
        let spk_outbound = tokio_stream::wrappers::ReceiverStream::new(spk_rx);

        let mic_connect = mic_ws.from_audio::<ListenClientIO>(mic_outbound);
        let spk_connect = spk_ws.from_audio::<ListenClientIO>(spk_outbound);

        let ((mic_stream, mic_handle), (spk_stream, spk_handle)) =
            tokio::try_join!(mic_connect, spk_connect)?;

        tokio::spawn(forward_dual_to_single(stream, mic_tx, spk_tx));

        let merged_stream = merge_streams_with_channel_remap(mic_stream, spk_stream);

        Ok((
            Box::pin(merged_stream),
            DualHandle::Split {
                mic: mic_handle,
                spk: spk_handle,
            },
        ))
    }
}

async fn forward_dual_to_single(
    mut stream: impl Stream<Item = ListenClientDualInput> + Send + Unpin + 'static,
    mic_tx: tokio::sync::mpsc::Sender<ListenClientInput>,
    spk_tx: tokio::sync::mpsc::Sender<ListenClientInput>,
) {
    while let Some(msg) = stream.next().await {
        match msg {
            MixedMessage::Audio((mic, spk)) => {
                let _ = mic_tx.try_send(MixedMessage::Audio(mic));
                let _ = spk_tx.try_send(MixedMessage::Audio(spk));
            }
            MixedMessage::Control(ctrl) => {
                let _ = mic_tx.send(MixedMessage::Control(ctrl.clone())).await;
                let _ = spk_tx.send(MixedMessage::Control(ctrl)).await;
            }
        }
    }
}

fn merge_streams_with_channel_remap<S1, S2>(
    mic_stream: S1,
    spk_stream: S2,
) -> impl Stream<Item = Result<StreamResponse, hypr_ws::Error>> + Send
where
    S1: Stream<Item = Result<StreamResponse, hypr_ws::Error>> + Send + 'static,
    S2: Stream<Item = Result<StreamResponse, hypr_ws::Error>> + Send + 'static,
{
    let mic_mapped = mic_stream.map(|result| {
        result.map(|mut response| {
            response.set_channel_index(0, 2);
            response
        })
    });

    let spk_mapped = spk_stream.map(|result| {
        result.map(|mut response| {
            response.set_channel_index(1, 2);
            response
        })
    });

    futures_util::stream::select(mic_mapped, spk_mapped)
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
