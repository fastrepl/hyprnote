use anyhow::Result;
use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::error::Error;

use deepgram::common::{
    options::{Encoding, Language, Model, Options},
    stream_response::StreamResponse as DeepgramStreamResponse,
};
use futures_core::Stream;
use futures_util::StreamExt;

use super::{RealtimeSpeechToText, StreamResponse};

#[derive(Debug, Clone)]
pub struct DeepgramClient {
    #[allow(unused)]
    config: DeepgramConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepgramConfig {
    pub api_key: String,
}

impl DeepgramClient {
    pub fn new(config: DeepgramConfig) -> Self {
        Self { config }
    }
}

impl<S, E> RealtimeSpeechToText<S, E> for DeepgramClient {
    async fn transcribe(&mut self, stream: S) -> Result<impl Stream<Item = Result<StreamResponse>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static,
    {
        let deepgram = deepgram::Deepgram::with_base_url_and_api_key(
            "https://api.deepgram.com/v1",
            self.config.api_key.clone(),
        )
        .unwrap();

        let options = Options::builder()
            .model(Model::Nova2Meeting)
            .multichannel(false)
            .smart_format(true)
            .punctuate(true)
            .numerals(true)
            .language(Language::en)
            .filler_words(false)
            .diarize(false)
            .keywords(["Hyprnote"])
            .build();

        let deepgram_stream = deepgram
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

        Ok(transformed_stream)
    }
}

impl TryFrom<DeepgramStreamResponse> for StreamResponse {
    type Error = anyhow::Error;

    fn try_from(response: DeepgramStreamResponse) -> Result<Self, Self::Error> {
        match response {
            DeepgramStreamResponse::TranscriptResponse { channel, .. } => {
                let data = channel.alternatives.first().unwrap();
                let text = data.transcript.clone();
                let start = data.words.first().unwrap().start;
                let end = data.words.last().unwrap().end;

                Ok(StreamResponse { text, start, end })
            }
            e => {
                eprintln!("deepgram response: {:?}", e);
                Err(anyhow::anyhow!("no conversion defined"))
            }
        }
    }
}
