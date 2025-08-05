use crate::common_derives;

// https://github.com/deepgram/deepgram-rust-sdk/blob/0.7.0/src/common/stream_response.rs
// https://developers.deepgram.com/reference/speech-to-text-api/listen-streaming#receive.receiveTranscription

common_derives! {
    pub struct Word {
        pub word: String,
        pub start: f64,
        pub end: f64,
        pub confidence: f64,
        pub speaker: Option<i32>,
        pub punctuated_word: Option<String>,
        pub language: Option<String>,
    }
}

common_derives! {
    pub struct Alternatives {
        pub transcript: String,
        pub words: Vec<Word>,
        pub confidence: f64,
        #[serde(default)]
        pub languages: Vec<String>,
    }
}

common_derives! {
    pub struct Channel {
        pub alternatives: Vec<Alternatives>,
    }
}

common_derives! {
    pub struct ModelInfo {
        pub name: String,
        pub version: String,
        pub arch: String,
    }
}

common_derives! {
    pub struct Metadata {
        pub request_id: String,
        pub model_info: ModelInfo,
        pub model_uuid: String,
    }
}

common_derives! {
    #[serde(untagged)]
    #[non_exhaustive]
    pub enum StreamResponse {
        TranscriptResponse {
            #[serde(rename = "type")]
            type_field: String,
            start: f64,
            duration: f64,
            is_final: bool,
            speech_final: bool,
            from_finalize: bool,
            channel: Channel,
            metadata: Metadata,
            channel_index: Vec<i32>,
        },
        TerminalResponse {
            request_id: String,
            created: String,
            duration: f64,
            channels: u32,
        },
        SpeechStartedResponse {
            #[serde(rename = "type")]
            type_field: String,
            channel: Vec<u8>,
            timestamp: f64,
        },
        UtteranceEndResponse {
            #[serde(rename = "type")]
            type_field: String,
            channel: Vec<u8>,
            last_word_end: f64,
        },
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use deepgram::common::stream_response as DG;

    #[test]
    fn ensure_types() {
        let dg = DG::StreamResponse::TranscriptResponse {
            type_field: "transcript".to_string(),
            start: 0.0,
            duration: 0.0,
            is_final: false,
            speech_final: false,
            from_finalize: false,
            channel: DG::Channel {
                alternatives: vec![],
            },
            metadata: DG::Metadata {
                request_id: "".to_string(),
                model_info: DG::ModelInfo {
                    name: "".to_string(),
                    version: "".to_string(),
                    arch: "".to_string(),
                },
                model_uuid: "".to_string(),
            },
            channel_index: vec![],
        };

        let serialized = serde_json::to_string(&dg).unwrap();
        let _: StreamResponse = serde_json::from_str(&serialized).unwrap();
    }
}
