use axum::extract::FromRef;

use clerk_rs::clerk::Clerk;
use shuttle_runtime::SecretStore;

use hypr_analytics::AnalyticsClient;
use hypr_db::admin::AdminDatabase;

#[derive(Clone)]
pub struct AppState {
    pub secrets: SecretStore,
    pub reqwest: reqwest::Client,
    pub clerk: Clerk,
    pub stt: hypr_stt::Client,
    pub analytics: AnalyticsClient,
}

#[derive(Clone)]
pub struct AuthState {
    pub clerk: Clerk,
}

#[derive(Clone)]
pub struct AnalyticsState {
    pub analytics: AnalyticsClient,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(app_state: &AppState) -> AuthState {
        AuthState {
            clerk: app_state.clerk.clone(),
        }
    }
}

impl FromRef<AppState> for AnalyticsState {
    fn from_ref(app_state: &AppState) -> AnalyticsState {
        AnalyticsState {
            analytics: app_state.analytics.clone(),
        }
    }
}
