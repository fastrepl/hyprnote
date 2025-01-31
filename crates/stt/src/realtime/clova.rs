use anyhow::Result;
use bytes::Bytes;
use futures_core::Stream;
use futures_util::{future, StreamExt};
use std::error::Error;

use super::{RealtimeSpeechToText, StreamResponse, StreamResponseWord};

pub use hypr_clova::realtime::interface as clova;

impl<S, E> RealtimeSpeechToText<S, E> for hypr_clova::realtime::Client {
    async fn transcribe(
        &mut self,
        audio: S,
    ) -> Result<Box<dyn Stream<Item = Result<StreamResponse>> + Send + Unpin>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let transcription = self.stream(audio).await?;

        let stream = transcription.filter_map(|item| {
            let item = match item {
                Ok(response) => Some(StreamResponse::try_from(response)),
                Err(e) => Some(Err(e.into())),
            };

            future::ready(item)
        });

        Ok(Box::from(Box::pin(stream)))
    }
}

impl TryFrom<clova::StreamResponse> for StreamResponse {
    type Error = anyhow::Error;

    fn try_from(response: clova::StreamResponse) -> Result<Self, Self::Error> {
        match response {
            clova::StreamResponse::TranscribeSuccess(r) => Ok(StreamResponse {
                words: vec![StreamResponseWord {
                    text: r.transcription.text,
                    start: r.transcription.start_timestamp,
                    end: r.transcription.end_timestamp,
                }],
            }),
            _ => anyhow::bail!("Unexpected response type"),
        }
    }
}
