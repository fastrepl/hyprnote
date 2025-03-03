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
    pub struct ListenInputChunk {
        #[serde(serialize_with = "serde_bytes::serialize")]
        pub audio: Vec<u8>,
    }
}

pub type DiarizeInputChunk = ListenInputChunk;
pub type DiarizeOutputChunk = hypr_db_user::DiarizationChunk;
