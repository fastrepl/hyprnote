use axum::{Json, Router, http::StatusCode, response::IntoResponse, routing::get};
use serde::Serialize;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<String>,
}

pub fn router() -> Router {
    Router::new().route("/detailed", get(detailed_health_check))
}

async fn detailed_health_check() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(HealthResponse {
            status: "ok",
            message: Some(
                "For real-time error monitoring, use OpenStatus push-based reporting".to_string(),
            ),
        }),
    )
}
