#[macro_export]
macro_rules! common_derives {
    ($item:item) => {
        #[derive(
            PartialEq,
            Debug,
            Clone,
            serde::Serialize,
            serde::Deserialize,
            specta::Type,
            schemars::JsonSchema,
        )]
        #[schemars(deny_unknown_fields)]
        $item
    };
}

common_derives! {
    pub struct TranscriptChunk {
        pub start: u64,
        pub end: u64,
        pub text: String,
    }
}

common_derives! {
    pub struct DiarizationChunk {
        pub start: u64,
        pub end: u64,
        pub speaker: String,
    }
}

common_derives! {
    pub enum ListenOutputChunk {
        Transcribe(TranscriptChunk),
        Diarize(DiarizationChunk),
    }
}

common_derives! {
    #[derive(Default)]
    pub struct ListenInputChunk {
        #[serde(serialize_with = "serde_bytes::serialize")]
        pub audio: Vec<u8>,
    }
}

common_derives! {
    pub struct ListenParams {
        #[specta(type = String)]
        #[schemars(with = "String")]
        pub language: codes_iso_639::part_1::LanguageCode,
        pub static_prompt: String,
        pub dynamic_prompt: String,
    }
}

impl Default for ListenParams {
    fn default() -> Self {
        Self {
            language: codes_iso_639::part_1::LanguageCode::En,
            static_prompt: "".to_string(),
            dynamic_prompt: "".to_string(),
        }
    }
}
