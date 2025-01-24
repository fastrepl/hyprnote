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
            codes_iso_639::part_1::LanguageCode::En => deepgram::common::options::Language::en,
            _ => panic!("Unsupported language: {:?}", self.language.unwrap()),
        };

        let client = deepgram::Deepgram::with_base_url_and_api_key(
            "https://api.deepgram.com/v1",
            self.api_key.unwrap(),
        )
        .unwrap();

        DeepgramClient {
            client,
            language,
            keywords: self.keywords.unwrap_or_default(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct DeepgramClient {
    pub client: deepgram::Deepgram,
    pub language: deepgram::common::options::Language,
    pub keywords: Vec<String>,
}

impl DeepgramClient {
    pub fn builder() -> DeepgramClientBuilder {
        DeepgramClientBuilder::default()
    }
}
