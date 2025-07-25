use axum::{
    extract::{Query, State},
    response::IntoResponse,
    Json,
};

use crate::state::STTState;

use hypr_listener_interface::ListenParams;
use hypr_stt::recorded::{RecordedSpeech, RecordedSpeechToText};

pub async fn handler(
    Query(params): Query<ListenParams>,
    State(state): State<STTState>,
) -> impl IntoResponse {
    let stt = state
        .recorded_stt
        .for_language(params.languages.first().unwrap().clone())
        .await;

    let input = RecordedSpeech::File("TODO".into());
    let result = stt.transcribe(input).await.unwrap();

    Json(result)
}
