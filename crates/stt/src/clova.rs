use anyhow::Result;
use bytes::Bytes;
use futures::{Stream, StreamExt};
use std::error::Error;

use crate::{RealtimeSpeechToText, StreamResponse};

pub use hypr_clova::{interface as clova, Client as ClovaClient, Config as ClovaConfig};

impl<S, E> RealtimeSpeechToText<S, E> for ClovaClient {
    async fn transcribe(&mut self, audio: S) -> Result<impl Stream<Item = Result<StreamResponse>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let transcription = self.stream(audio).await?;

        return Ok(transcription.map(|r| match r {
            Ok(clova::StreamResponse::Success(r)) => Ok(StreamResponse {
                text: r.transcription.text,
            }),
            Ok(clova::StreamResponse::Failure(r)) => {
                Err(anyhow::anyhow!("Failed to transcribe: {:?}", r))
            }
            Err(e) => Err(e.into()),
        }));
    }
}
