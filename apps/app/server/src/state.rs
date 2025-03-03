use axum::extract::FromRef;

use clerk_rs::clerk::Clerk;
use hypr_analytics::AnalyticsClient;
use hypr_db_admin::AdminDatabase;
use hypr_nango::NangoClient;
use hypr_openai::OpenAIClient;
use hypr_s3::Client as S3Client;
use hypr_turso::TursoClient;

#[derive(Clone)]
pub struct AppState {
    pub openai: OpenAIClient,
    pub clerk: Clerk,
    pub realtime_stt: hypr_stt::realtime::Client,
    pub recorded_stt: hypr_stt::recorded::Client,
    pub diarize: hypr_bridge::diarize::DiarizeClient,
    pub admin_db: AdminDatabase,
    pub analytics: AnalyticsClient,
    pub turso: TursoClient,
    pub nango: NangoClient,
    pub s3: S3Client,
    pub stripe: stripe::Client,
}

#[derive(Clone)]
pub struct WorkerState {
    pub clerk: Clerk,
    pub turso: TursoClient,
    pub nango: NangoClient,
    pub admin_db: AdminDatabase,
}

#[derive(Clone)]
pub struct STTState {
    pub realtime_stt: hypr_stt::realtime::Client,
    pub recorded_stt: hypr_stt::recorded::Client,
    pub diarize: hypr_bridge::diarize::DiarizeClient,
}

#[derive(Clone)]
pub struct AuthState {
    pub clerk: Clerk,
    pub admin_db: AdminDatabase,
    pub turso: TursoClient,
}

#[derive(Clone)]
pub struct AnalyticsState {
    pub analytics: AnalyticsClient,
}

impl FromRef<AppState> for STTState {
    fn from_ref(app_state: &AppState) -> STTState {
        STTState {
            realtime_stt: app_state.realtime_stt.clone(),
            recorded_stt: app_state.recorded_stt.clone(),
            diarize: app_state.diarize.clone(),
        }
    }
}

impl FromRef<AppState> for AuthState {
    fn from_ref(app_state: &AppState) -> AuthState {
        AuthState {
            clerk: app_state.clerk.clone(),
            admin_db: app_state.admin_db.clone(),
            turso: app_state.turso.clone(),
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

impl FromRef<AppState> for WorkerState {
    fn from_ref(s: &AppState) -> WorkerState {
        WorkerState {
            clerk: s.clerk.clone(),
            turso: s.turso.clone(),
            nango: s.nango.clone(),
            admin_db: s.admin_db.clone(),
        }
    }
}
