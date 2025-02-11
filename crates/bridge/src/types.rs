use serde_bytes;

macro_rules! common_derives {
    ($item:item) => {
        #[derive(
            Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, schemars::JsonSchema,
        )]
        #[schemars(deny_unknown_fields)]
        $item
    };
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("unknown error")]
    Unknown,
    #[error("connection error")]
    Connection(#[from] tokio_tungstenite::tungstenite::Error),
    #[error("reqwest error")]
    Reqwest(#[from] reqwest::Error),
    #[error("timeout error")]
    Timeout(#[from] tokio::time::error::Elapsed),
}

common_derives! {
    pub enum ListenOutputChunk {
        Transcribe(hypr_db::user::TranscriptChunk),
        Diarize(hypr_db::user::DiarizationChunk),
    }
}

common_derives! {
    pub struct ListenInputChunk {
        #[serde(serialize_with = "serde_bytes::serialize")]
        pub audio: Vec<u8>,
    }
}

pub type DiarizeInputChunk = ListenInputChunk;
pub type TranscribeInputChunk = ListenInputChunk;
pub type DiarizeOutputChunk = hypr_db::user::DiarizationChunk;
pub type TranscribeOutputChunk = hypr_db::user::TranscriptChunk;

common_derives! {
    pub struct EnhanceRequest {
        pub pre_meeting_editor: String,
        pub in_meeting_editor: String,
        pub template: hypr_db::user::Template,
        pub config: hypr_db::user::Config,
        pub event: Option<hypr_db::user::Event>,
        pub participants: Vec<hypr_db::user::Human>,
        pub timeline_view: TimelineView,
    }
}

common_derives! {
    pub struct CreateTitleRequest {
        pub config: hypr_db::user::Config,
        pub timeline_view: TimelineView,
    }
}

common_derives! {
    pub struct CreateTitleResponse {
        pub title: String,
    }
}

common_derives! {
    pub struct PostprocessEnhanceRequest {
        pub editor: String,
    }
}

common_derives! {
    pub struct PostprocessEnhanceResponse {
        pub editor: String,
    }
}

common_derives! {
    pub struct LiveSummaryRequest {
        pub config: hypr_db::user::Config,
        pub timeline_view: TimelineView,
    }
}

common_derives! {
    pub struct LiveSummaryResponse {
        pub blocks: Vec<SummarizeTranscriptChunk>,
    }
}

common_derives! {
    pub struct SummarizeTranscriptChunk {
        pub points: Vec<String>,
    }
}

common_derives! {
    pub struct TimelineView {
        pub items: Vec<TimelineViewItem>,
    }
}

common_derives! {
    pub struct TimelineViewItem {
        pub start: u64,
        pub end: u64,
        pub speaker: String,
        pub text: String,
    }
}
