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
    #[derive(Default)]
    pub struct ListenParams {
        #[specta(type = String)]
        #[schemars(with = "String")]
        pub language: hypr_language::Language,
        pub static_prompt: String,
        pub dynamic_prompt: String,
    }
}
