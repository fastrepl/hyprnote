use anyhow::Result;
use bytes::Bytes;
use std::error::Error;

use deepgram::listen::websocket::TranscriptionStream;
use futures::{Stream, StreamExt};

use crate::RealtimeSpeechToText;

pub struct Clova {}

impl<S, E> RealtimeSpeechToText<S, E> for Clova {
    async fn transcribe(&self, stream: S) -> Result<TranscriptionStream>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        todo!()
    }
}
