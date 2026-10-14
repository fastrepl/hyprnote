use anlg_analytics::{AnalyticsPayload, PropertiesPayload, ToAnalyticsPayload};
use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;
use utoipa::{IntoParams, ToSchema};

use anlg_api_error::error_response;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TrialPolicy {
    pro_trial_days: u32,
    work_email_pro_trial_days: u32,
    referral_pro_trial_days: u32,
}

static TRIAL_POLICY: LazyLock<TrialPolicy> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../packages/pricing/src/trial-policy.json"
    ))
    .expect("shared trial policy must be valid JSON")
});

pub(crate) fn pro_trial_days() -> u32 {
    TRIAL_POLICY.pro_trial_days
}

#[derive(Debug, Deserialize, Serialize, Clone, Copy, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum TrialOffer {
    Referral,
    WorkEmail,
    PersonalEmail,
}

impl TrialOffer {
    pub(crate) fn days(self) -> u32 {
        match self {
            Self::Referral => TRIAL_POLICY.referral_pro_trial_days,
            Self::WorkEmail => TRIAL_POLICY.work_email_pro_trial_days,
            Self::PersonalEmail => pro_trial_days(),
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Referral => "referral",
            Self::WorkEmail => "work_email",
            Self::PersonalEmail => "personal_email",
        }
    }
}

fn trial_end_date(
    now: chrono::DateTime<Utc>,
    stripe_trial_end: Option<i64>,
    trial_days: u32,
) -> String {
    stripe_trial_end
        .and_then(|timestamp| chrono::DateTime::from_timestamp(timestamp, 0))
        .unwrap_or_else(|| now + chrono::Duration::days(i64::from(trial_days)))
        .to_rfc3339()
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct StartTrialQuery {
    #[serde(default = "default_interval")]
    #[param(example = "monthly")]
    pub interval: Interval,
}

fn default_interval() -> Interval {
    Interval::Monthly
}

#[derive(Debug, Deserialize, Clone, Copy, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum Interval {
    Monthly,
    Yearly,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum StartTrialReason {
    Started,
    NotEligible,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct StartTrialResponse {
    #[schema(example = true)]
    pub started: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<StartTrialReason>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(example = 30)]
    pub trial_days: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offer: Option<TrialOffer>,
}

pub(crate) enum TrialOutcome {
    NotEligible,
    StripeError(String),
    CustomerError(String),
    RpcError(String),
    Started(Interval, Option<i64>, TrialOffer),
}

impl ToAnalyticsPayload for TrialOutcome {
    fn to_analytics_payload(&self) -> AnalyticsPayload {
        match self {
            Self::NotEligible => AnalyticsPayload::builder("trial_skipped")
                .with("reason", "not_eligible")
                .build(),
            Self::StripeError(_) => AnalyticsPayload::builder("trial_failed")
                .with("reason", "stripe_error")
                .build(),
            Self::CustomerError(_) => AnalyticsPayload::builder("trial_failed")
                .with("reason", "customer_error")
                .build(),
            Self::RpcError(_) => AnalyticsPayload::builder("trial_failed")
                .with("reason", "rpc_error")
                .build(),
            Self::Started(interval, _, offer) => {
                let plan = match interval {
                    Interval::Monthly => "pro_monthly",
                    Interval::Yearly => "pro_yearly",
                };
                AnalyticsPayload::builder("trial_created")
                    .with("plan", plan)
                    .with("offer", offer.as_str())
                    .with("trial_days", offer.days())
                    .build()
            }
        }
    }

    fn to_analytics_properties(&self) -> Option<PropertiesPayload> {
        match self {
            Self::Started(_, stripe_trial_end, offer) => {
                let trial_end_date = trial_end_date(Utc::now(), *stripe_trial_end, offer.days());
                Some(
                    PropertiesPayload::builder()
                        .set("plan", "trial")
                        .set("trial_end_date", trial_end_date)
                        .build(),
                )
            }
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use anlg_analytics::ToAnalyticsPayload;
    use chrono::{TimeZone, Utc};
    use serde_json::json;

    use super::{Interval, TrialOffer, TrialOutcome, trial_end_date};

    #[test]
    fn analytics_falls_back_to_the_offer_trial_duration() {
        let now = Utc.with_ymd_and_hms(2026, 7, 17, 0, 0, 0).unwrap();

        assert_eq!(
            trial_end_date(now, None, TrialOffer::WorkEmail.days()),
            "2026-08-16T00:00:00+00:00"
        );
    }

    #[test]
    fn analytics_uses_stripes_actual_trial_end_when_available() {
        let stripe_trial_end = Utc
            .with_ymd_and_hms(2026, 8, 9, 12, 30, 0)
            .unwrap()
            .timestamp();
        let outcome = TrialOutcome::Started(
            Interval::Monthly,
            Some(stripe_trial_end),
            TrialOffer::Referral,
        );
        let event = outcome.to_analytics_payload();
        let properties = outcome.to_analytics_properties().unwrap();

        assert_eq!(event.event, "trial_created");
        assert_eq!(event.props.get("plan"), Some(&json!("pro_monthly")));
        assert_eq!(event.props.get("offer"), Some(&json!("referral")));
        assert_eq!(properties.set.get("plan"), Some(&json!("trial")));
        assert_eq!(
            properties.set.get("trial_end_date"),
            Some(&json!("2026-08-09T12:30:00+00:00"))
        );
    }
}

impl IntoResponse for TrialOutcome {
    fn into_response(self) -> Response {
        match self {
            Self::NotEligible => Json(StartTrialResponse {
                started: false,
                reason: Some(StartTrialReason::NotEligible),
                trial_days: None,
                offer: None,
            })
            .into_response(),
            Self::StripeError(msg) => error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "failed_to_create_subscription",
                &msg,
            ),
            Self::CustomerError(msg) => error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "failed_to_create_customer",
                &msg,
            ),
            Self::RpcError(msg) => {
                error_response(StatusCode::INTERNAL_SERVER_ERROR, "rpc_error", &msg)
            }
            Self::Started(_, _, offer) => Json(StartTrialResponse {
                started: true,
                reason: Some(StartTrialReason::Started),
                trial_days: Some(offer.days()),
                offer: Some(offer),
            })
            .into_response(),
        }
    }
}
