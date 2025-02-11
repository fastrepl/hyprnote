use axum::{extract::State, http::StatusCode, Extension, Json};

use crate::{
    state::AppState,
    types::{Membership, Subscription},
};

pub async fn handler(
    State(_state): State<AppState>,
    Extension(_org): Extension<hypr_db::admin::Organization>,
) -> Result<Json<Subscription>, StatusCode> {
    Ok(Json(Subscription {
        membership: Membership::Trial,
    }))
}
