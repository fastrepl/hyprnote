use std::net::Ipv4Addr;
use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::{self, Next},
    response::Response,
    Router,
};
use axum_extra::{headers::authorization::Bearer, headers::Authorization, TypedHeader};

#[derive(Clone)]
pub struct AppState {
    pub api_key: Option<String>,
}

pub struct Server {
    config: owhisper_config::Config,
    port: Option<u16>,
}

impl Server {
    pub fn new(config: owhisper_config::Config, port: Option<u16>) -> Self {
        Self { config, port }
    }

    pub async fn build_router(&self) -> anyhow::Result<Router> {
        let api_key = self.config.general.as_ref().and_then(|g| g.api_key.clone());
        let app_state = Arc::new(AppState { api_key });

        let stt_router = self.build_stt_router().await?;

        let app = Router::new()
            .route("/health", axum::routing::get(health))
            .merge(stt_router)
            .layer(middleware::from_fn_with_state(
                app_state.clone(),
                auth_middleware,
            ));

        Ok(app)
    }

    pub async fn run(self) -> anyhow::Result<()> {
        let router = self.build_router().await?;

        let listener = tokio::net::TcpListener::bind(if let Some(port) = self.port {
            SocketAddr::from((Ipv4Addr::LOCALHOST, port))
        } else {
            SocketAddr::from((Ipv4Addr::UNSPECIFIED, 0))
        })
        .await?;

        println!(
            "Server started on port {}",
            listener.local_addr().unwrap().port()
        );

        axum::serve(listener, router.into_make_service()).await?;
        Ok(())
    }

    async fn build_stt_router(&self) -> anyhow::Result<Router> {
        let mut router = Router::new();

        if let Some(serve_config) = &self.config.serve {
            if let Some(aws_config) = &serve_config.aws {
                let aws_service = build_aws_service(aws_config).await?;
                router = router.route_service("/aws", aws_service);
            }

            if let Some(whisper_config) = &serve_config.whisper_cpp {
                let whisper_service = build_whisper_cpp_service(whisper_config)?;
                router = router.route_service("/whisper-cpp", whisper_service);
            }
        }

        Ok(router)
    }
}

async fn build_aws_service(
    _config: &owhisper_config::ServeAwsConfig,
) -> anyhow::Result<hypr_transcribe_aws::TranscribeService> {
    hypr_transcribe_aws::TranscribeService::new(hypr_transcribe_aws::TranscribeConfig::default())
        .await
        .map_err(|e| anyhow::anyhow!("Failed to create AWS service: {}", e))
}

fn build_whisper_cpp_service(
    config: &owhisper_config::ServeWhisperCppConfig,
) -> anyhow::Result<hypr_transcribe_whisper_local::WhisperStreamingService> {
    Ok(
        hypr_transcribe_whisper_local::WhisperStreamingService::builder()
            .model_path(config.model_path.clone().into())
            .build(),
    )
}

async fn health() -> &'static str {
    "OK"
}

async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    auth_header: Option<TypedHeader<Authorization<Bearer>>>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if state.api_key.is_none() {
        return Ok(next.run(req).await);
    }

    let expected_token = state
        .api_key
        .as_ref()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    match auth_header {
        None => Err(StatusCode::UNAUTHORIZED),
        Some(TypedHeader(Authorization(bearer))) => {
            if bearer.token() == expected_token {
                Ok(next.run(req).await)
            } else {
                Err(StatusCode::UNAUTHORIZED)
            }
        }
    }
}
