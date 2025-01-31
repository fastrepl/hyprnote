use anyhow::Result;
use bytes::Bytes;
use futures_core::Stream;
use futures_util::{future, StreamExt};
use std::error::Error;

use super::{RealtimeSpeechToText, StreamResponse};

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
                Ok(clova::StreamResponse::TranscribeSuccess(r)) => Some(Ok(StreamResponse {
                    text: r.transcription.text,
                    start: r.transcription.start_timestamp as f64 / 1000.0,
                    end: r.transcription.end_timestamp as f64 / 1000.0,
                })),
                Ok(_) => None,
                Err(e) => Some(Err(e.into())),
            };

            future::ready(item)
        });

        Ok(Box::from(Box::pin(stream)))
    }
}
