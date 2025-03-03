#[macro_export]
macro_rules! common_derives {
    ($item:item) => {
        #[derive(
            Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, schemars::JsonSchema,
        )]
        #[schemars(deny_unknown_fields)]
        $item
    };
}

common_derives! {
    pub enum ListenOutputChunk {
        Transcribe(hypr_db_user::TranscriptChunk),
        Diarize(hypr_db_user::DiarizationChunk),
    }
}

common_derives! {
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
    }
}
