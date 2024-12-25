use anyhow::Result;
use bytes::Bytes;
use futures::Stream;
use std::error::Error;

mod clova;
pub use clova::*;

mod deep;
pub use deep::*;

trait RealtimeSpeechToText<S, E> {
    async fn transcribe(&self, stream: S) -> Result<impl Stream<Item = Result<StreamResponse>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static;
}

pub struct StreamResponse {
    pub text: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    #[serial]
    fn test_transcribe() {
        assert!(true);
    }
}
