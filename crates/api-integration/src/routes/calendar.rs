use axum::{Json, extract::State, http::HeaderMap};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::error::{IntegrationError, Result};
use crate::state::AppState;

#[derive(Debug, Deserialize, ToSchema)]
pub struct ListEventsRequest {
    pub connection_id: String,
    pub calendar_id: String,
    #[serde(default)]
    pub time_min: Option<String>,
    #[serde(default)]
    pub time_max: Option<String>,
    #[serde(default)]
    pub max_results: Option<u32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub single_events: Option<bool>,
    #[serde(default)]
    pub order_by: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListEventsResponse {
    pub events: Vec<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}

#[utoipa::path(
    post,
    path = "/calendar/events",
    request_body = ListEventsRequest,
    responses(
        (status = 200, description = "Events fetched", body = ListEventsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "integration",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn list_events(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<ListEventsRequest>,
) -> Result<Json<ListEventsResponse>> {
    let auth_token = extract_token(&headers)?;

    let auth = state
        .config
        .auth
        .as_ref()
        .ok_or_else(|| IntegrationError::Auth("Auth not configured".to_string()))?;

    auth.verify_token(auth_token)
        .await
        .map_err(|e| IntegrationError::Auth(e.to_string()))?;

    let client =
        hypr_google_calendar::GoogleCalendarClient::new(&state.nango, &payload.connection_id);

    let time_min = payload
        .time_min
        .as_deref()
        .map(|s| {
            chrono::DateTime::parse_from_rfc3339(s)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .map_err(|e| IntegrationError::BadRequest(format!("Invalid time_min: {e}")))
        })
        .transpose()?;

    let time_max = payload
        .time_max
        .as_deref()
        .map(|s| {
            chrono::DateTime::parse_from_rfc3339(s)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .map_err(|e| IntegrationError::BadRequest(format!("Invalid time_max: {e}")))
        })
        .transpose()?;

    let req = hypr_google_calendar::ListEventsRequest {
        calendar_id: payload.calendar_id,
        time_min,
        time_max,
        max_results: payload.max_results,
        page_token: payload.page_token,
        single_events: payload.single_events,
        order_by: payload.order_by,
    };

    let response = client
        .list_events(req)
        .await
        .map_err(|e| IntegrationError::Nango(e.to_string()))?;

    let events: Vec<serde_json::Value> = response
        .items
        .iter()
        .map(|e| serde_json::to_value(e).unwrap_or_default())
        .collect();

    Ok(Json(ListEventsResponse {
        events,
        next_page_token: response.next_page_token,
    }))
}

fn extract_token(headers: &HeaderMap) -> Result<&str> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| IntegrationError::Auth("Missing Authorization header".to_string()))?;

    hypr_supabase_auth::SupabaseAuth::extract_token(auth_header)
        .ok_or_else(|| IntegrationError::Auth("Invalid Authorization header".to_string()))
}
