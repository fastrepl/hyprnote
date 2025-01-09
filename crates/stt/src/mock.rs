use anyhow::Result;
use bytes::Bytes;
use futures::{Stream, StreamExt};
use std::error::Error;

use crate::{RealtimeSpeechToText, StreamResponse};

pub struct MockClient {}

impl MockClient {
    #[allow(unused)]
    pub fn new() -> Self {
        Self {}
    }
}

impl<S, E> RealtimeSpeechToText<S, E> for MockClient {
    async fn transcribe(&mut self, audio: S) -> Result<impl Stream<Item = Result<StreamResponse>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let response_stream = audio.then(|maybe_bytes| async move {
            match maybe_bytes {
                Err(e) => Err(anyhow::anyhow!("error: {}", e)),
                Ok(bytes) => {
                    let size = bytes.len();
                    let non_zero_count = bytes.iter().filter(|b| **b != 0).count();
                    let text = format!("Received {} bytes, {} non-zero", size, non_zero_count);
                    Ok(StreamResponse { text })
                }
            }
        });

        Ok(Box::pin(response_stream))
    }
}
