use anlg_analytics::DeviceFingerprint;
use axum::{Extension, Json, extract::State};
use serde::Serialize;
use serde_json::json;
use utoipa::ToSchema;

use crate::state::AppState;
use crate::trial::TrialOffer;

use anlg_api_auth::AuthContext;

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum CanStartTrialReason {
    Eligible,
    NotEligible,
    Error,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CanStartTrialResponse {
    #[schema(example = true)]
    pub can_start_trial: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<CanStartTrialReason>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offer: Option<TrialOffer>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(example = 30)]
    pub trial_days: Option<u32>,
}

#[utoipa::path(
    get,
    path = "/can-start-trial",
    responses(
        (status = 200, description = "Check successful", body = CanStartTrialResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "subscription",
)]
pub async fn can_start_trial(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthContext>,
    device_fingerprint: Option<Extension<DeviceFingerprint>>,
) -> Json<CanStartTrialResponse> {
    let device_fingerprint =
        device_fingerprint.map(|Extension(DeviceFingerprint(fingerprint))| fingerprint);

    let result: std::result::Result<bool, _> = state
        .supabase
        .rpc(
            "can_start_trial",
            &auth.token,
            Some(json!({
                "p_device_fingerprint": device_fingerprint,
            })),
        )
        .await;

    match result {
        Ok(true) => {
            let offer = state
                .supabase
                .rpc::<Option<TrialOffer>>("get_pro_trial_offer", &auth.token, None)
                .await
                .inspect_err(|e| tracing::warn!(error = %e, "get_pro_trial_offer_rpc_failed"))
                .ok()
                .flatten();
            Json(CanStartTrialResponse {
                can_start_trial: true,
                reason: Some(CanStartTrialReason::Eligible),
                offer,
                trial_days: offer.map(TrialOffer::days),
            })
        }
        Ok(false) => Json(CanStartTrialResponse {
            can_start_trial: false,
            reason: Some(CanStartTrialReason::NotEligible),
            offer: None,
            trial_days: None,
        }),
        Err(e) => {
            tracing::error!(error = %e, "can_start_trial_rpc_failed");
            Json(CanStartTrialResponse {
                can_start_trial: false,
                reason: Some(CanStartTrialReason::Error),
                offer: None,
                trial_days: None,
            })
        }
    }
}
