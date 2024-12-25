use anyhow::Result;
use bytes::Bytes;
use std::error::Error;

use deepgram::listen::websocket::TranscriptionStream;
use futures::{Stream, StreamExt};

use crate::RealtimeSpeechToText;

pub struct Deepgram {}

impl<S, E> RealtimeSpeechToText<S, E> for Deepgram {
    async fn transcribe(&self, stream: S) -> Result<TranscriptionStream>
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
            .await?;

        Ok(stream)
    }
}
