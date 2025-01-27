use anyhow::Result;
use std::{future::Future, ops::Mul};

mod clova;
mod deepgram;

use crate::deepgram::DeepgramClient;

pub enum RecordedSpeech {
    File(std::path::PathBuf),
}

#[allow(unused)]
pub trait RecordedSpeechToText {
    fn transcribe(&self, input: RecordedSpeech) -> impl Future<Output = Result<String>>;
}

#[derive(Debug, Default)]
pub struct ClientBuilder {
    pub deepgram_api_key: Option<String>,
    pub clova_api_key: Option<String>,
}

impl ClientBuilder {
    pub fn deepgram_api_key(mut self, api_key: impl Into<String>) -> Self {
        self.deepgram_api_key = Some(api_key.into());
        self
    }

    pub fn clova_api_key(mut self, api_key: impl Into<String>) -> Self {
        self.clova_api_key = Some(api_key.into());
        self
    }

    pub fn build(self) -> Client {
        Client {
            deepgram_api_key: self.deepgram_api_key.unwrap(),
            clova_api_key: self.clova_api_key.unwrap(),
        }
    }
}

#[derive(Debug)]
pub enum MultiClient {
    Deepgram(DeepgramClient),
    Clova(hypr_clova::recorded::Client),
}

#[derive(Debug, Clone)]
pub struct Client {
    pub deepgram_api_key: String,
    pub clova_api_key: String,
}

impl Client {
    pub fn builder() -> ClientBuilder {
        ClientBuilder::default()
    }

    pub async fn for_language(&self, language: codes_iso_639::part_1::LanguageCode) -> MultiClient {
        match language {
            codes_iso_639::part_1::LanguageCode::Ko => {
                let clova = hypr_clova::recorded::Client::builder()
                    .api_key(&self.clova_api_key)
                    .build();
                MultiClient::Clova(clova)
            }
            codes_iso_639::part_1::LanguageCode::En => {
                let deepgram = DeepgramClient::builder()
                    .api_key(&self.deepgram_api_key)
                    .keywords(vec!["Hyprnote".to_string()])
                    .language(language)
                    .build();

                MultiClient::Deepgram(deepgram)
            }
            _ => panic!("Unsupported language: {:?}", language),
        }
    }
}

impl RecordedSpeechToText for MultiClient {
    async fn transcribe(&self, input: RecordedSpeech) -> Result<String> {
        match self {
            MultiClient::Deepgram(client) => client.transcribe(input).await,
            MultiClient::Clova(client) => client.transcribe(input).await,
        }
    }
}
