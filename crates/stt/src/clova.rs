// use anyhow::Result;
// use bytes::Bytes;
// use std::error::Error;

// use futures::Stream;
// use hypr_clova::{interface as clova, Client as ClovaClient, Config as ClovaConfig};

// use crate::{RealtimeSpeechToText, TranscriptionStream};

// pub struct Clova {}

// impl<S, E> RealtimeSpeechToText<S, E> for Clova {
//     async fn transcribe(&self, stream: S) -> Result<TranscriptionStream>
//     where
//         S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
//         E: Error + Send + Sync + 'static,
//     {
//         unimplemented!()
//     }
// }
