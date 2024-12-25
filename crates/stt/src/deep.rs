use anyhow::Result;
use bytes::Bytes;
use std::error::Error;

use deepgram::{
    common::stream_response::StreamResponse as DeepgramStreamResponse,
    listen::websocket::TranscriptionStream as DeepgramTranscriptionStream,
};
use futures::{Stream, StreamExt};

use crate::{RealtimeSpeechToText, StreamResponse};

pub struct Deepgram {}

impl<S, E> RealtimeSpeechToText<S, E> for Deepgram {
    async fn transcribe(&self, stream: S) -> Result<impl Stream<Item = Result<StreamResponse>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let deepgram = deepgram::Deepgram::with_base_url_and_api_key(
            "https://api.deepgram.com/v1",
            "your-api-key-here",
        )
        .unwrap();

        let stream = deepgram
            .transcription()
            .stream_request()
            .keep_alive()
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
            _ => "".to_string(),
        };
        StreamResponse { text }
    }
}
