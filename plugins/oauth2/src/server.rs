use std::net::{Ipv4Addr, SocketAddr};
use std::sync::Arc;

use axum::{
    extract::{Query, State as AxumState},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use hypr_oauth_callback::service::{OAuthServerService, SecretStore};
use hypr_oauth_core::{OAuthRequest, OAuthResponse, TokenResponse};
use hypr_oauth_providers::ProviderRegistry;
use serde::Deserialize;
use tower::{Service, ServiceExt};
use tower_http::cors::{self, CorsLayer};

#[derive(Clone)]
pub struct ServerHandle {
    pub addr: SocketAddr,
    pub shutdown: tokio::sync::watch::Sender<()>,
}

// Simple implementation of SecretStore
#[derive(Clone)]
struct PluginSecretStore;

impl SecretStore for PluginSecretStore {
    fn get_client_secret(&self, provider: &str) -> Option<String> {
        // TODO: Implement proper secret storage
        // For now, this should be configured through environment variables
        // or secure configuration
        match provider {
            "github" => std::env::var("GITHUB_CLIENT_SECRET").ok(),
            "google" => std::env::var("GOOGLE_CLIENT_SECRET").ok(),
            _ => None,
        }
    }
}

#[derive(Clone)]
struct AppState {
    oauth_service: OAuthServerService,
}

pub async fn run_server() -> Result<ServerHandle, crate::Error> {
    // Initialize OAuth providers and service
    let providers = Arc::new(ProviderRegistry::new());
    let secret_store = Arc::new(PluginSecretStore);
    let oauth_service = OAuthServerService::new(providers, secret_store);

    let app_state = AppState { oauth_service };

    let app = Router::new()
        .route("/health", get(health))
        .route("/oauth/authorize", post(oauth_authorize))
        .route("/oauth/callback", get(oauth_callback))
        .with_state(app_state)
        .layer(
            CorsLayer::new()
                .allow_origin(cors::Any)
                .allow_methods(cors::Any)
                .allow_headers(cors::Any),
        );

    let listener =
        tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, 0))).await?;

    let server_addr = listener.local_addr()?;

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(());

    let server_handle = ServerHandle {
        addr: server_addr,
        shutdown: shutdown_tx,
    };

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async move {
                shutdown_rx.changed().await.ok();
            })
            .await
            .unwrap();
    });

    tracing::info!("oauth2_server_started {}", server_addr);
    Ok(server_handle)
}

async fn health() -> impl IntoResponse {
    StatusCode::OK
}

// OAuth authorization endpoint - starts the OAuth flow
async fn oauth_authorize(
    AxumState(state): AxumState<AppState>,
    Json(request): Json<OAuthRequest>,
) -> Result<Json<OAuthResponse>, (StatusCode, String)> {
    let mut service = state.oauth_service.clone();

    match service.ready().await {
        Ok(service) => match service.call(request).await {
            Ok(response) => Ok(Json(response)),
            Err(err) => Err((StatusCode::BAD_REQUEST, "OAuth error".to_string())),
        },
        Err(err) => Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "Service unavailable".to_string(),
        )),
    }
}

// OAuth callback endpoint - handles the redirect from the OAuth provider
#[derive(Deserialize)]
struct CallbackParams {
    code: String,
    state: String,
}

async fn oauth_callback(
    Query(params): Query<CallbackParams>,
) -> Result<Json<TokenResponse>, (StatusCode, String)> {
    // TODO: This is a placeholder - you'll need to implement the actual callback handling
    // which would typically:
    // 1. Verify the state parameter
    // 2. Exchange the code for tokens using the OAuth service
    // 3. Return the tokens or redirect to the app

    Err((
        StatusCode::NOT_IMPLEMENTED,
        "Callback handling not yet implemented".to_string(),
    ))
}
