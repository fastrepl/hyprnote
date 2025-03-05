use hypr_ws::client::{ClientRequestBuilder, Message, WebSocketClient, WebSocketIO};

#[derive(Default)]
pub struct WhisperClientBuilder {
    api_base: Option<String>,
    api_key: Option<String>,
}

#[derive(Clone)]
pub struct WhisperClient {
    request: ClientRequestBuilder,
}

#[derive(Debug, serde::Deserialize)]
pub struct WhisperOutputChunk {
    pub text: String,
}

impl WebSocketIO for WhisperClient {
    type Input = bytes::Bytes;
    type Output = WhisperOutputChunk;

    fn to_input(data: bytes::Bytes) -> Self::Input {
        data
    }

    fn to_message(input: Self::Input) -> Message {
        Message::Binary(input)
    }

    fn from_message(msg: Message) -> Option<Self::Output> {
        match msg {
            Message::Text(text) => serde_json::from_str::<Self::Output>(&text).ok(),
            _ => None,
        }
    }
}
