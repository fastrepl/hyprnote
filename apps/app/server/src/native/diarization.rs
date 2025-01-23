use axum::{extract::State, http::StatusCode, Json};

use crate::state::AppState;

pub type SubmitRequest = hypr_pyannote::submit_diarization_job::Request;
pub type SubmitResponse = hypr_pyannote::submit_diarization_job::Response;
pub type RetrieveRequest = hypr_pyannote::get_job::Request;
pub type RetrieveResponse = hypr_pyannote::get_job::Response;

pub async fn submit(
    State(state): State<AppState>,
    Json(input): Json<hypr_pyannote::submit_diarization_job::Request>,
) -> Result<Json<hypr_pyannote::submit_diarization_job::Response>, StatusCode> {
    let res = state
        .pyannote
        .submit_diarization_job(input)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(res))
}

pub async fn retrieve(
    State(state): State<AppState>,
    Json(input): Json<hypr_pyannote::get_job::Request>,
) -> Result<Json<hypr_pyannote::get_job::Response>, StatusCode> {
    let res = state
        .pyannote
        .get_job(input)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(res))
}
