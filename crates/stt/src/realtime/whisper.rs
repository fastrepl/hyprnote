use anyhow::Result;
use bytes::Bytes;
use futures_util::{future, Stream, StreamExt};
use std::error::Error;

use hypr_audio_utils::AudioFormatExt;
use hypr_whisper::cloud::WhisperClient;

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
