use anyhow::Result;
use axum::{extract::State, http::StatusCode, response::IntoResponse, Extension, Json};

use crate::state::AppState;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreateUploadRequest {
    file_name: String,
    num_parts: usize,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreateUploadResponse {
    upload_id: String,
    presigned_urls: Vec<String>,
}

pub async fn create_upload(
    Extension(user): Extension<hypr_db::admin::User>,
    State(state): State<AppState>,
    Json(input): Json<CreateUploadRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let user_s3 = state.s3.for_user(user.id);

    let upload_id = user_s3
        .create_multipart_upload(&input.file_name)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let presigned_urls = user_s3
        .presigned_url_for_multipart_upload(&input.file_name, &upload_id, input.num_parts)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(CreateUploadResponse {
        upload_id,
        presigned_urls,
    }))
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CompleteUploadRequest {
    file_name: String,
    upload_id: String,
    presigned_urls: Vec<String>,
}

pub async fn complete_upload(
    Extension(user): Extension<hypr_db::admin::User>,
    State(state): State<AppState>,
    Json(input): Json<CompleteUploadRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let user_s3 = state.s3.for_user(user.id);
    let _result = user_s3
        .complete_multipart_upload(&input.file_name, &input.upload_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}
