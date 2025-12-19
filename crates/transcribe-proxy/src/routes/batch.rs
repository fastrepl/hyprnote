use std::collections::HashMap;

use axum::{
    Json,
    extract::{Query, State},
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};

use super::AppState;

#[derive(Debug, Deserialize)]
pub struct BatchRequest {
    pub url: String,
}

#[derive(Debug, Serialize)]
pub struct BatchResponse {
    pub metadata: BatchMetadata,
    pub results: BatchResults,
}

#[derive(Debug, Serialize)]
pub struct BatchMetadata {
    pub request_id: String,
    pub duration: f64,
    pub channels: u32,
}

#[derive(Debug, Serialize)]
pub struct BatchResults {
    pub channels: Vec<Channel>,
}

#[derive(Debug, Serialize)]
pub struct Channel {
    pub alternatives: Vec<Alternative>,
}

#[derive(Debug, Serialize)]
pub struct Alternative {
    pub transcript: String,
    pub confidence: f64,
    pub words: Vec<Word>,
}

#[derive(Debug, Serialize)]
pub struct Word {
    pub word: String,
    pub start: f64,
    pub end: f64,
    pub confidence: f64,
}

pub async fn handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(request): Json<BatchRequest>,
) -> Response {
    let (provider, _api_key) = match state.resolve_provider(&params) {
        Ok(v) => v,
        Err(resp) => return resp,
    };

    tracing::info!(
        provider = ?provider,
        url = %request.url,
        "batch transcription request received (mock)"
    );

    let response = BatchResponse {
        metadata: BatchMetadata {
            request_id: uuid::Uuid::new_v4().to_string(),
            duration: 0.0,
            channels: 1,
        },
        results: BatchResults {
            channels: vec![Channel {
                alternatives: vec![Alternative {
                    transcript: String::new(),
                    confidence: 0.0,
                    words: vec![],
                }],
            }],
        },
    };

    Json(response).into_response()
}
