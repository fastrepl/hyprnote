use serde::{Deserialize, Serialize};

use crate::TimelineView;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("unknown error")]
    Unknown,
    #[error("connection error")]
    Connection(#[from] tokio_tungstenite::tungstenite::Error),
    #[error("reqwest error")]
    Reqwest(#[from] reqwest::Error),
}

#[derive(Debug, Clone, Deserialize, Serialize, specta::Type)]
pub enum ListenOutputChunk {
    Transcribe(hypr_db::user::TranscriptChunk),
    Diarize(hypr_db::user::DiarizationChunk),
}

#[derive(Debug, Clone, Deserialize, Serialize, specta::Type)]
pub struct ListenInputChunk {
    #[serde(with = "serde_bytes")]
    pub audio: Vec<u8>,
}

pub type DiarizeInputChunk = ListenInputChunk;
pub type TranscribeInputChunk = ListenInputChunk;
pub type DiarizeOutputChunk = hypr_db::user::DiarizationChunk;
pub type TranscribeOutputChunk = hypr_db::user::TranscriptChunk;

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct EnhanceRequest {
    pub pre_meeting_editor: String,
    pub in_meeting_editor: String,
    pub template: hypr_db::user::Template,
    pub config_general: hypr_db::user::ConfigDataGeneral,
    pub config_profile: hypr_db::user::ConfigDataProfile,
    pub event: Option<hypr_db::user::Event>,
    pub participants: Vec<hypr_db::user::Participant>,
    pub timeline_view: TimelineView,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct CreateTitleRequest {
    pub transcripts: Vec<hypr_db::user::TranscriptChunk>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct CreateTitleResponse {
    pub title: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct PostprocessEnhanceRequest {
    pub editor: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct PostprocessEnhanceResponse {
    pub editor: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct SummarizeTranscriptRequest {
    pub transcripts: Vec<hypr_db::user::TranscriptChunk>,
    pub diarizations: Vec<hypr_db::user::DiarizationChunk>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct SummarizeTranscriptResponse {
    pub blocks: Vec<SummarizeTranscriptChunk>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct SummarizeTranscriptChunk {
    pub points: Vec<String>,
}
