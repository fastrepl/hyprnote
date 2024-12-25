use anyhow::Result;
use bytes::Bytes;
use std::error::Error;

use futures::Stream;

use crate::{RealtimeSpeechToText, StreamResponse};

#[allow(unused)]
use hypr_clova::{interface as clova, Client as ClovaClient, Config as ClovaConfig};

impl<S, E> RealtimeSpeechToText<S, E> for ClovaClient {
    async fn transcribe(&self, _stream: S) -> Result<impl Stream<Item = Result<StreamResponse>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let s = futures::stream::empty();
        Ok(s)
    }
}
