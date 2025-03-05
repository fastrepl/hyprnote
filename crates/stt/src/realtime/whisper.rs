use anyhow::Result;
use bytes::Bytes;
use futures_core::Stream;
use futures_util::{future, StreamExt};
use std::error::Error;

use super::{RealtimeSpeechToText, StreamResponse, StreamResponseWord};

impl<S, E> RealtimeSpeechToText<S, E> for WhisperClient {
    async fn transcribe(
        &mut self,
        audio: S,
    ) -> Result<Box<dyn Stream<Item = Result<StreamResponse>> + Send + Unpin>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        todo!()
    }
}
