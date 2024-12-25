use anyhow::Result;
use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::error::Error;

use deepgram::common::{
    options::Encoding, stream_response::StreamResponse as DeepgramStreamResponse,
};
use futures::{Stream, StreamExt};

use crate::{RealtimeSpeechToText, StreamResponse};

pub struct DeepgramClient {
    #[allow(unused)]
    config: DeepgramConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepgramConfig {
    pub api_key: String,
}

impl DeepgramClient {
    pub fn new(config: DeepgramConfig) -> Self {
        Self { config }
    }
}

impl<S, E> RealtimeSpeechToText<S, E> for DeepgramClient {
    async fn transcribe(&self, stream: S) -> Result<impl Stream<Item = Result<StreamResponse>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let deepgram = deepgram::Deepgram::with_base_url_and_api_key(
            "https://api.deepgram.com/v1",
            self.config.api_key.clone(),
        )
        .unwrap();

        let stream = deepgram
            .transcription()
            .stream_request()
            .keep_alive()
            .sample_rate(16000)
            .channels(1)
            .encoding(Encoding::Linear16)
            .stream(stream)
            .await?
            .map(|result| result.map(Into::into).map_err(Into::into));

        Ok(stream)
    }
}

impl From<DeepgramStreamResponse> for StreamResponse {
    fn from(response: DeepgramStreamResponse) -> Self {
        let text = match response {
            DeepgramStreamResponse::TranscriptResponse { channel, .. } => {
                channel.alternatives.first().unwrap().transcript.clone()
            }
            DeepgramStreamResponse::TerminalResponse { .. } => "".to_string(),
            DeepgramStreamResponse::SpeechStartedResponse { .. } => "".to_string(),
            DeepgramStreamResponse::UtteranceEndResponse { .. } => "".to_string(),
            _ => "".to_string(),
        };
        StreamResponse { text }
    }
}
