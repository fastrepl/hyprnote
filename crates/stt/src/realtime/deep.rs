use anyhow::Result;
use bytes::Bytes;
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
    api_key: String,
    language: deepgram::common::options::Language,
    keywords: Vec<String>,
}

#[derive(Debug, Default)]
pub struct DeepgramClientBuilder {
    api_key: Option<String>,
    language: Option<codes_iso_639::part_1::LanguageCode>,
    keywords: Option<Vec<String>>,
}

impl DeepgramClientBuilder {
    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn language(mut self, language: codes_iso_639::part_1::LanguageCode) -> Self {
        self.language = Some(language);
        self
    }

    pub fn keywords(mut self, keywords: impl Into<Vec<String>>) -> Self {
        self.keywords = Some(keywords.into());
        self
    }

    pub fn build(self) -> DeepgramClient {
        let language = match self.language.unwrap() {
            codes_iso_639::part_1::LanguageCode::En => Language::en,
            _ => panic!("Unsupported language: {:?}", self.language.unwrap()),
        };

        DeepgramClient {
            api_key: self.api_key.unwrap(),
            language,
            keywords: self.keywords.unwrap_or_default(),
        }
    }
}

impl DeepgramClient {
    pub fn builder() -> DeepgramClientBuilder {
        DeepgramClientBuilder::default()
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
            &self.api_key,
        )
        .unwrap();

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
            e => {
                eprintln!("deepgram response: {:?}", e);
                Err(anyhow::anyhow!("no conversion defined"))
            }
        }
    }
}
