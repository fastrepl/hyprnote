use anyhow::Result;
use bytes::Bytes;
use futures_core::Stream;
use futures_util::{future, StreamExt};
use std::error::Error;

use super::{RealtimeSpeechToText, StreamResponse};

pub use hypr_clova::{interface as clova, Client as ClovaClient};

impl<S, E> RealtimeSpeechToText<S, E> for ClovaClient {
    async fn transcribe(
        &mut self,
        audio: S,
    ) -> Result<Box<dyn Stream<Item = Result<StreamResponse>> + Send + Unpin>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let transcription = self.stream(audio).await?;

        let stream = transcription
            .filter_map(|item| {
                let item = match item {
                    Ok(clova::StreamResponse::TranscribeSuccess(r)) => Some(Ok(StreamResponse {
                        text: r.transcription.text,
                        start: r.transcription.start_timestamp as f64 / 1000.0,
                        end: r.transcription.end_timestamp as f64 / 1000.0,
                    })),
                    Ok(_) => None,
                    Err(e) => Some(Err(e.into())),
                };

                future::ready(item)
            })
            .scan(Vec::<StreamResponse>::new(), |buffer, item| match item {
                Ok(response) => {
                    buffer.push(response);

                    let should_emit = if let Some(last) = buffer.last() {
                        last.text.ends_with('.') || buffer.len() >= 6
                    } else {
                        false
                    };

                    if !should_emit {
                        return future::ready(Some(None));
                    }

                    let combined = StreamResponse {
                        text: buffer.iter().map(|r| r.text.clone()).collect::<String>(),
                        start: buffer.first().map(|r| r.start).unwrap_or(0.0),
                        end: buffer.last().map(|r| r.end).unwrap_or(0.0),
                    };
                    buffer.clear();
                    future::ready(Some(Some(Ok(combined))))
                }
                Err(e) => future::ready(Some(Some(Err(e)))),
            })
            .filter_map(|v| future::ready(v));

        Ok(Box::from(Box::pin(stream)))
    }
}
