use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
};
use owhisper_client::CallbackResult;
use serde::Deserialize;

use hypr_supabase_storage::SupabaseStorage;

use super::{AppState, RouteError, parse_async_provider, process_provider_callback};
use crate::supabase::{PipelineStatus, SupabaseClient};

#[derive(Deserialize)]
pub(crate) struct CallbackQuery {
    secret: Option<String>,
}

pub async fn handler(
    State(state): State<AppState>,
    supabase: SupabaseClient,
    Path((provider, id)): Path<(String, String)>,
    Query(query): Query<CallbackQuery>,
    body: axum::body::Bytes,
) -> Result<StatusCode, RouteError> {
    let expected_secret = state
        .config
        .callback_secret
        .as_deref()
        .ok_or(RouteError::MissingConfig("callback_secret not configured"))?;

    match query.secret.as_deref() {
        Some(s) if s == expected_secret => {}
        _ => return Err(RouteError::Unauthorized("invalid callback secret")),
    }

    let payload: serde_json::Value = serde_json::from_slice(&body).map_err(|e| {
        tracing::warn!(error = %e, "invalid callback payload");
        RouteError::BadRequest("invalid JSON payload".into())
    })?;

    let owhisper_provider = parse_async_provider(&provider)?;

    let api_key = state
        .config
        .api_keys
        .get(&owhisper_provider)
        .cloned()
        .ok_or(RouteError::MissingConfig(
            "api_key not configured for provider",
        ))?;

    let outcome =
        process_provider_callback(owhisper_provider, &state.client, &api_key, payload)
            .await
            .map_err(|e| {
                tracing::error!(id = %id, provider = %provider, error = %e, "callback processing failed");
                RouteError::Internal(format!("callback processing failed: {e}"))
            })?;

    let update = match &outcome {
        CallbackResult::Done(raw_result) => serde_json::json!({
            "status": PipelineStatus::Done,
            "raw_result": raw_result,
            "updated_at": chrono::Utc::now().to_rfc3339(),
        }),
        CallbackResult::ProviderError(message) => serde_json::json!({
            "status": PipelineStatus::Error,
            "error": message,
            "updated_at": chrono::Utc::now().to_rfc3339(),
        }),
    };

    let file_id = supabase
        .get_job(&id)
        .await
        .ok()
        .flatten()
        .map(|j| j.file_id);

    supabase
        .update_job(&id, &update)
        .await
        .map_err(|e| RouteError::Internal(format!("failed to update job: {e}")))?;

    if let Some(file_id) = file_id {
        cleanup_audio(&supabase, &file_id).await;
    }

    Ok(StatusCode::OK)
}

async fn cleanup_audio(supabase: &SupabaseClient, file_id: &str) {
    let storage = SupabaseStorage::new(
        supabase.client.clone(),
        &supabase.url,
        &supabase.service_role_key,
    );
    if let Err(e) = storage.delete_file("audio-files", file_id).await {
        tracing::warn!(
            file_id = %file_id,
            error = %e,
            "failed to delete audio file"
        );
    }
}
