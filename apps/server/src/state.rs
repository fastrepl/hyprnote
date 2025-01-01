use axum::extract::FromRef;

use clerk_rs::clerk::Clerk;
use hypr_analytics::AnalyticsClient;
use hypr_db::admin::AdminDatabase;

#[derive(Clone)]
pub struct AppState {
    pub reqwest: reqwest::Client,
    pub clerk: Clerk,
    pub stt: hypr_stt::Client,
    pub admin_db: AdminDatabase,
    pub analytics: AnalyticsClient,
}

#[derive(Clone)]
pub struct AuthState {
    pub clerk: Clerk,
    pub admin_db: AdminDatabase,
}

#[derive(Clone)]
pub struct AnalyticsState {
    pub analytics: AnalyticsClient,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(app_state: &AppState) -> AuthState {
        AuthState {
            clerk: app_state.clerk.clone(),
            admin_db: app_state.admin_db.clone(),
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
