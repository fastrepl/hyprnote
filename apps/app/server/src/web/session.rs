use axum::{extract::Path, http::StatusCode, Extension, Json};

pub async fn handler(
    Extension(db): Extension<hypr_db::user::UserDatabase>,
    Path(id): Path<String>,
) -> Result<Json<hypr_db::user::Session>, StatusCode> {
    let session = db
        .get_session(hypr_db::user::SessionFilter::Id(id))
        .await
        .map_err(|e| {
            tracing::error!("Error getting session: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(session))
}
