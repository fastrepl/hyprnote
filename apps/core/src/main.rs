use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, net::SocketAddr, sync::Arc};
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};

type SharedState = Arc<RwLock<AppState>>;

#[derive(Default)]
struct AppState {
    store: HashMap<String, serde_json::Value>,
}

#[derive(Deserialize)]
struct InvokeRequest {
    cmd: String,
    #[serde(default)]
    args: serde_json::Value,
}

#[derive(Serialize)]
struct InvokeResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Deserialize)]
struct StoreGetArgs {
    scope: String,
    key: String,
}

#[derive(Deserialize)]
struct StoreSetArgs {
    scope: String,
    key: String,
    value: serde_json::Value,
}

async fn health() -> impl IntoResponse {
    "ok"
}

async fn invoke(
    State(state): State<SharedState>,
    Json(request): Json<InvokeRequest>,
) -> impl IntoResponse {
    let result = handle_command(&request.cmd, request.args, state).await;

    match result {
        Ok(data) => (
            StatusCode::OK,
            Json(InvokeResponse {
                data: Some(data),
                error: None,
            }),
        ),
        Err(e) => (
            StatusCode::OK,
            Json(InvokeResponse {
                data: None,
                error: Some(e),
            }),
        ),
    }
}

async fn handle_command(
    cmd: &str,
    args: serde_json::Value,
    state: SharedState,
) -> Result<serde_json::Value, String> {
    match cmd {
        "plugin:store2|get_str" => {
            let args: StoreGetArgs = serde_json::from_value(args).map_err(|e| e.to_string())?;
            let key = format!("{}:{}", args.scope, args.key);
            let state = state.read().await;
            let value = state.store.get(&key).cloned();
            Ok(serde_json::to_value(value).unwrap())
        }
        "plugin:store2|set_str" => {
            let args: StoreSetArgs = serde_json::from_value(args).map_err(|e| e.to_string())?;
            let key = format!("{}:{}", args.scope, args.key);
            let mut state = state.write().await;
            state.store.insert(key, args.value);
            Ok(serde_json::Value::Null)
        }
        "get_onboarding_needed" => Ok(serde_json::Value::Bool(false)),
        "get_env" => Ok(serde_json::Value::String("".to_string())),
        _ => Err(format!("Unknown command: {}", cmd)),
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "hypr_core=debug,tower_http=debug".into()),
        )
        .init();

    let state = SharedState::default();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(health))
        .route("/invoke", post(invoke))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 9527));
    tracing::info!("hypr-core server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
