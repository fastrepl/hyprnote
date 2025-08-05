use std::{
    net::{Ipv4Addr, SocketAddr},
    path::PathBuf,
};

use axum::{http::StatusCode, response::IntoResponse, routing::get, Router};
use tower_http::cors::{self, CorsLayer};

use hypr_whisper_local_model::WhisperModel;

#[derive(Default)]
pub struct ServerStateBuilder {
    pub model_type: Option<WhisperModel>,
    pub model_cache_dir: Option<PathBuf>,
}

impl ServerStateBuilder {
    pub fn model_cache_dir(mut self, model_cache_dir: PathBuf) -> Self {
        self.model_cache_dir = Some(model_cache_dir);
        self
    }

    pub fn model_type(mut self, model_type: WhisperModel) -> Self {
        self.model_type = Some(model_type);
        self
    }

    pub fn build(self) -> ServerState {
        ServerState {
            model_type: self.model_type.unwrap(),
            model_cache_dir: self.model_cache_dir.unwrap(),
        }
    }
}

#[derive(Clone)]
pub struct ServerState {
    model_type: WhisperModel,
    model_cache_dir: PathBuf,
}

impl ServerState {
    pub fn builder() -> ServerStateBuilder {
        ServerStateBuilder::default()
    }
}

#[derive(Clone)]
pub struct ServerHandle {
    pub addr: SocketAddr,
    pub shutdown: tokio::sync::watch::Sender<()>,
}

pub async fn run_server(state: ServerState) -> Result<ServerHandle, crate::Error> {
    let router = make_service_router(state);

    let listener =
        tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, 0))).await?;

    let server_addr = listener.local_addr()?;

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(());

    let server_handle = ServerHandle {
        addr: server_addr,
        shutdown: shutdown_tx,
    };

    tokio::spawn(async move {
        axum::serve(listener, router)
            .with_graceful_shutdown(async move {
                shutdown_rx.changed().await.ok();
            })
            .await
            .unwrap();
    });

    tracing::info!("local_stt_server_started {}", server_addr);
    Ok(server_handle)
}

fn make_service_router(state: ServerState) -> Router {
    let model_path = state.model_cache_dir.join(state.model_type.file_name());

    let whisper_service = hypr_transcribe_whisper_local::WhisperStreamingService::builder()
        .model_path(model_path)
        .build();

    Router::new()
        .route("/health", get(health))
        .route_service("/v1/listen", whisper_service)
        .layer(
            CorsLayer::new()
                .allow_origin(cors::Any)
                .allow_methods(cors::Any)
                .allow_headers(cors::Any),
        )
}

async fn health() -> impl IntoResponse {
    StatusCode::OK
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    use hypr_whisper_local_model::WhisperModel;

    #[tokio::test]
    async fn test_health_endpoint() {
        let state = ServerStateBuilder::default()
            .model_cache_dir(dirs::data_dir().unwrap().join("com.hyprnote.dev/stt"))
            .model_type(WhisperModel::QuantizedTinyEn)
            .build();

        let app = make_service_router(state);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }
}
