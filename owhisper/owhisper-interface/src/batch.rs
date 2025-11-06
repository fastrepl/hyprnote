use crate::common_derives;

// https://github.com/deepgram/deepgram-rust-sdk/blob/0.7.0/src/common/batch_response.rs
// https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded

common_derives! {
    #[specta(rename = "BatchWord")]
    pub struct Word {
        pub word: String,
        pub start: f64,
        pub end: f64,
        pub confidence: f64,
        pub speaker: Option<usize>,
        pub punctuated_word: Option<String>,
    }
}

common_derives! {
    #[specta(rename = "BatchAlternatives")]
    pub struct Alternatives {
        pub transcript: String,
        pub confidence: f64,
        #[serde(default)]
        pub words: Vec<Word>,
    }
}

common_derives! {
    #[specta(rename = "BatchChannel")]
    pub struct Channel {
        pub alternatives: Vec<Alternatives>,
    }
}

common_derives! {
    #[specta(rename = "BatchResults")]
    pub struct Results {
        pub channels: Vec<Channel>,
    }
}

common_derives! {
    #[specta(rename = "BatchResponse")]
    pub struct Response {
        pub metadata: serde_json::Value,
        pub results: Results,
    }
}
