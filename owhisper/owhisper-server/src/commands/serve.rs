use std::sync::Arc;

use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::{self, Next},
    response::Response,
};
use axum_extra::{headers::authorization::Bearer, headers::Authorization, TypedHeader};

#[derive(clap::Args)]
pub struct ServeArgs {
    #[arg(short, long)]
    pub config_path: String,
    #[arg(short, long)]
    pub port: u16,
}

#[derive(Clone)]
struct AppState {
    api_key: Option<String>,
}

pub async fn handle_serve(args: ServeArgs) -> anyhow::Result<()> {
    let config = owhisper_config::Config::new(&args.config_path);

    let api_key = config.general.as_ref().and_then(|g| g.api_key.clone());
    let app_state = Arc::new(AppState { api_key });

    let stt_router = build_stt_router(&config).await?;
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", args.port)).await?;

    let app = axum::Router::new()
        .route("/health", axum::routing::get(health))
        .merge(stt_router)
        .layer(middleware::from_fn_with_state(
            app_state.clone(),
            auth_middleware,
        ))
        .into_make_service();

    axum::serve(listener, app).await?;
    Ok(())
}

async fn build_stt_router(config: &owhisper_config::Config) -> anyhow::Result<axum::Router> {
    let mut router = axum::Router::new();

    if let Some(serve_config) = &config.serve {
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
