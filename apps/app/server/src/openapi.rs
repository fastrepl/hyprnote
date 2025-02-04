use aide::openapi::OpenApi;
use axum::{response::IntoResponse, Extension, Json};

pub async fn handler(Extension(api): Extension<OpenApi>) -> impl IntoResponse {
    Json(api)
}
