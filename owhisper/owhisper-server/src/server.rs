use std::collections::HashMap;
use std::net::{Ipv4Addr, SocketAddr};
use std::sync::Arc;

use axum::{
    extract::{Path, Request, State},
    http::StatusCode,
    middleware::{self, Next},
    response::Response,
    routing::get,
    Router,
};
use axum_extra::{headers::authorization::Bearer, headers::Authorization, TypedHeader};
use tower::Service;

#[derive(Clone)]
pub struct AppState {
    pub api_key: Option<String>,
    pub services: HashMap<String, TranscriptionService>,
}

#[derive(Clone)]
pub enum TranscriptionService {
    Aws(hypr_transcribe_aws::TranscribeService),
    Deepgram(hypr_transcribe_deepgram::TranscribeService),
    WhisperCpp(hypr_transcribe_whisper_local::WhisperStreamingService),
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

        let mut services = HashMap::new();
        for model in &self.config.models {
            let service = match model {
                owhisper_config::ModelConfig::Aws(config) => {
                    TranscriptionService::Aws(build_aws_service(config).await?)
                }
                owhisper_config::ModelConfig::Deepgram(config) => {
                    TranscriptionService::Deepgram(build_deepgram_service(config).await?)
                }
                owhisper_config::ModelConfig::WhisperCpp(config) => {
                    TranscriptionService::WhisperCpp(build_whisper_cpp_service(config)?)
                }
            };

            let id = match model {
                owhisper_config::ModelConfig::Aws(c) => &c.id,
                owhisper_config::ModelConfig::Deepgram(c) => &c.id,
                owhisper_config::ModelConfig::WhisperCpp(c) => &c.id,
            };

            services.insert(id.clone(), service);
        }

        let app_state = Arc::new(AppState { api_key, services });

        let stt_router = self.build_stt_router(app_state.clone()).await?;

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

        log::info!(
            "Server started on port {}",
            listener.local_addr().unwrap().port()
        );

        axum::serve(listener, router.into_make_service()).await?;
        Ok(())
    }

    pub async fn run_with_shutdown(
        self,
        shutdown_signal: impl std::future::Future<Output = ()> + Send + 'static,
    ) -> anyhow::Result<SocketAddr> {
        let router = self.build_router().await?;

        let listener = tokio::net::TcpListener::bind(if let Some(port) = self.port {
            SocketAddr::from((Ipv4Addr::LOCALHOST, port))
        } else {
            SocketAddr::from((Ipv4Addr::LOCALHOST, 0))
        })
        .await?;

        let addr = listener.local_addr()?;
        println!("Server started on {}", addr);

        let server = axum::serve(listener, router.into_make_service())
            .with_graceful_shutdown(shutdown_signal);

        tokio::spawn(async move {
            if let Err(e) = server.await {
                eprintln!("Server error: {}", e);
            }
        });

        Ok(addr)
    }

    async fn build_stt_router(&self, app_state: Arc<AppState>) -> anyhow::Result<Router> {
        let router = Router::new()
            .route("/v1/stt/realtime", axum::routing::any(handle_transcription))
            .with_state(app_state);

        Ok(router)
    }
}

async fn build_aws_service(
    _config: &owhisper_config::AwsModelConfig,
) -> anyhow::Result<hypr_transcribe_aws::TranscribeService> {
    hypr_transcribe_aws::TranscribeService::new(hypr_transcribe_aws::TranscribeConfig::default())
        .await
        .map_err(|e| anyhow::anyhow!("Failed to create AWS service: {}", e))
}

fn build_whisper_cpp_service(
    config: &owhisper_config::WhisperCppModelConfig,
) -> anyhow::Result<hypr_transcribe_whisper_local::WhisperStreamingService> {
    Ok(
        hypr_transcribe_whisper_local::WhisperStreamingService::builder()
            .model_path(config.model_path.clone().into())
            .build(),
    )
}

async fn build_deepgram_service(
    config: &owhisper_config::DeepgramModelConfig,
) -> anyhow::Result<hypr_transcribe_deepgram::TranscribeService> {
    hypr_transcribe_deepgram::TranscribeService::new(config.clone())
        .await
        .map_err(|e| anyhow::anyhow!("Failed to create Deepgram service: {}", e))
}

async fn handle_transcription(
    State(state): State<Arc<AppState>>,
    Path(model_id): Path<String>,
    req: Request,
) -> Result<Response, StatusCode> {
    let service = state.services.get(&model_id).ok_or(StatusCode::NOT_FOUND)?;

    match service {
        TranscriptionService::Aws(svc) => {
            let mut svc_clone = svc.clone();
            svc_clone
                .call(req)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
        }
        TranscriptionService::Deepgram(svc) => {
            let mut svc_clone = svc.clone();
            svc_clone
                .call(req)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
        }
        TranscriptionService::WhisperCpp(svc) => {
            let mut svc_clone = svc.clone();
            svc_clone
                .call(req)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
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
