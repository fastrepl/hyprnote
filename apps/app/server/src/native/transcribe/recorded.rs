use axum::{
    extract::{Query, State},
    response::IntoResponse,
    Json,
};

use super::Params;
use crate::state::STTState;

use hypr_stt::recorded::{RecordedSpeech, RecordedSpeechToText};

pub async fn handler(
    Query(params): Query<Params>,
    State(state): State<STTState>,
) -> impl IntoResponse {
    let mut stt = state.recorded_stt.for_language(params.language).await;

    let input = RecordedSpeech::File("TODO".into());
    let result = stt.transcribe(input).await.unwrap();

    Json(result)
}
