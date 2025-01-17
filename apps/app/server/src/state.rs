use axum::extract::FromRef;

use clerk_rs::clerk::Clerk;
use hypr_analytics::AnalyticsClient;
use hypr_db::admin::AdminDatabase;
use hypr_lago::LagoClient;
use hypr_nango::NangoClient;
use hypr_openai::OpenAIClient;
use hypr_s3::Client as S3Client;
use hypr_stt::Client as STTClient;
use hypr_turso::TursoClient;

#[derive(Clone)]
pub struct AppState {
    pub openai: OpenAIClient,
    pub clerk: Clerk,
    pub stt: STTClient,
    pub admin_db: AdminDatabase,
    pub analytics: AnalyticsClient,
    pub turso: TursoClient,
    pub nango: NangoClient,
    pub lago: LagoClient,
    pub s3: S3Client,
}

#[derive(Clone)]
pub struct WorkerState {
    pub clerk: Clerk,
    pub lago: LagoClient,
    pub turso: TursoClient,
    pub nango: NangoClient,
    pub admin_db: AdminDatabase,
}

#[derive(Clone)]
pub struct STTState {
    pub stt: hypr_stt::Client,
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
            stt: app_state.stt.clone(),
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
            lago: s.lago.clone(),
            turso: s.turso.clone(),
            nango: s.nango.clone(),
            admin_db: s.admin_db.clone(),
        }
    }
}
