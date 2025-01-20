use anyhow::Result;
use bytes::Bytes;
use futures_core::Stream;
use futures_util::StreamExt;
use std::error::Error;

use super::{RealtimeSpeechToText, StreamResponse};

pub use hypr_clova::{interface as clova, Client as ClovaClient};

impl<S, E> RealtimeSpeechToText<S, E> for ClovaClient {
    async fn transcribe(&mut self, audio: S) -> Result<impl Stream<Item = Result<StreamResponse>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let transcription = self.stream(audio).await?;

        return Ok(transcription.map(|r| match r {
            Ok(clova::StreamResponse::TranscribeSuccess(r)) => Ok(StreamResponse {
                text: r.transcription.text,
                start: r.transcription.start_timestamp as f64 / 1000.0,
                end: r.transcription.end_timestamp as f64 / 1000.0,
            }),
            Ok(_) => Ok(StreamResponse {
                text: "".to_string(),
                start: 0.0,
                end: 0.0,
            }),
            Err(e) => Err(e.into()),
        }));
    }
}
