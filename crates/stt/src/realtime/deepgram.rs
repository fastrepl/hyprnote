use anyhow::Result;
use bytes::Bytes;
use std::error::Error;

use deepgram::common::{
    options::{Encoding, Model, Options},
    stream_response::StreamResponse as DeepgramStreamResponse,
};
use futures_core::Stream;
use futures_util::StreamExt;

use super::{RealtimeSpeechToText, StreamResponse};

impl<S, E> RealtimeSpeechToText<S, E> for crate::deepgram::DeepgramClient {
    async fn transcribe(
        &mut self,
        stream: S,
    ) -> Result<Box<dyn Stream<Item = Result<StreamResponse>> + Send + Unpin>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let options = Options::builder()
            .model(Model::Nova2Meeting)
            .multichannel(false)
            .smart_format(true)
            .punctuate(true)
            .numerals(true)
            .language(self.language.clone())
            .filler_words(false)
            .diarize(false)
            .keywords(self.keywords.iter().map(String::as_str))
            .build();

        let deepgram_stream = self
            .client
            .transcription()
            .stream_request_with_options(options)
            .keep_alive()
            .sample_rate(16 * 1000)
            .channels(1)
            .encoding(Encoding::Linear16)
            .stream(stream)
            .await?;

        let transformed_stream = deepgram_stream.map(|result| {
            result
                .map_err(Into::into)
                .and_then(|resp| StreamResponse::try_from(resp))
        });

        Ok(Box::from(Box::pin(transformed_stream)))
    }
}

impl TryFrom<DeepgramStreamResponse> for StreamResponse {
    type Error = anyhow::Error;

    fn try_from(response: DeepgramStreamResponse) -> Result<Self, Self::Error> {
        match response {
            DeepgramStreamResponse::TranscriptResponse { channel, .. } => {
                let data = channel.alternatives.first().unwrap();

                // TODO: returning Err here break something
                if data.words.is_empty() {
                    return Ok(StreamResponse {
                        text: "".to_string(),
                        start: 0.0,
                        end: 0.0,
                    });
                }

                let text = data.transcript.clone();
                let start = data.words.first().unwrap().start;
                let end = data.words.last().unwrap().end;

                Ok(StreamResponse { text, start, end })
            }
            DeepgramStreamResponse::SpeechStartedResponse { .. } => Ok(StreamResponse::default()),
            DeepgramStreamResponse::TerminalResponse { .. } => Ok(StreamResponse::default()),
            DeepgramStreamResponse::UtteranceEndResponse { .. } => Ok(StreamResponse::default()),
            _ => Err(anyhow::anyhow!("no conversion defined")),
        }
    }
}
