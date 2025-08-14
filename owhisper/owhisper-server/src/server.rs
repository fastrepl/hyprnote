use std::collections::HashMap;
use std::net::{Ipv4Addr, SocketAddr};
use std::sync::Arc;

use axum::{
    extract::{Request, State},
    http::{HeaderValue, StatusCode},
    middleware::Next,
    response::Response,
    Router,
};

use axum_extra::extract::Query;
use axum_extra::{
    headers::{
        authorization::{Bearer, Credentials},
        Authorization,
    },
    TypedHeader,
};
use tower::Service;
use tower_http::trace::{self, TraceLayer};
use tracing::Level;

#[derive(Clone)]
pub struct AppState {
    pub api_key: Option<String>,
    pub services: HashMap<String, TranscriptionService>,
}

#[derive(Clone)]
pub enum TranscriptionService {
    Aws(hypr_transcribe_aws::TranscribeService),
    Deepgram(hypr_transcribe_deepgram::TranscribeService),
    WhisperCpp(hypr_transcribe_whisper_local::TranscribeService),
    Moonshine(hypr_transcribe_moonshine::TranscribeService),
}

pub struct Server {
    config: owhisper_config::Config,
    port: Option<u16>,
}

impl Server {
    pub fn new(config: owhisper_config::Config, port: Option<u16>) -> Self {
        Self { config, port }
    }

    pub async fn build_router(&self) -> anyhow::Result<Router<()>> {
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
                owhisper_config::ModelConfig::Moonshine(config) => {
                    TranscriptionService::Moonshine(build_moonshine_service(config)?)
                }
            };

            let id = match model {
                owhisper_config::ModelConfig::Aws(c) => &c.id,
                owhisper_config::ModelConfig::Deepgram(c) => &c.id,
                owhisper_config::ModelConfig::WhisperCpp(c) => &c.id,
                owhisper_config::ModelConfig::Moonshine(c) => &c.id,
            };

            services.insert(id.clone(), service);
        }

        let app_state = Arc::new(AppState { api_key, services });

        let stt_router = self.build_stt_router(app_state.clone()).await;
        let other_router = Router::new()
            .route("/health", axum::routing::get(health))
            .route("/models", axum::routing::get(list_models))
            .route("/v1/models", axum::routing::get(list_models))
            .with_state(app_state.clone());

        let app = other_router
            .merge(stt_router)
            // .layer(middleware::from_fn_with_state(
            //     app_state.clone(),
            //     auth_middleware,
            // ))
            .layer(
                TraceLayer::new_for_http()
                    .make_span_with(trace::DefaultMakeSpan::new().level(Level::INFO))
                    .on_request(trace::DefaultOnRequest::new().level(Level::INFO))
                    .on_response(trace::DefaultOnResponse::new().level(Level::INFO))
                    .on_body_chunk(())
                    .on_eos(())
                    .on_failure(trace::DefaultOnFailure::new().level(Level::ERROR)),
            );

        Ok(app)
    }

    pub async fn run_with_shutdown(
        self,
        shutdown_signal: impl std::future::Future<Output = ()> + Send + 'static,
    ) -> anyhow::Result<u16> {
        let router = self.build_router().await?;

        let listener = tokio::net::TcpListener::bind(if let Some(port) = self.port {
            SocketAddr::from((Ipv4Addr::LOCALHOST, port))
        } else {
            SocketAddr::from((Ipv4Addr::LOCALHOST, 0))
        })
        .await?;

        let addr = listener.local_addr()?;
        log::info!("Server started on {}", addr);

        let server = axum::serve(listener, router.into_make_service())
            .with_graceful_shutdown(shutdown_signal);

        if let Err(e) = server.await {
            log::error!("{}", e);
            return Err(anyhow::anyhow!(e));
        }

        Ok(addr.port())
    }

    async fn build_stt_router(&self, app_state: Arc<AppState>) -> Router<()> {
        Router::new()
            .route("/listen", axum::routing::any(handle_transcription))
            .route("/v1/listen", axum::routing::any(handle_transcription))
            .with_state(app_state)
    }
}

async fn build_aws_service(
    config: &owhisper_config::AwsModelConfig,
) -> anyhow::Result<hypr_transcribe_aws::TranscribeService> {
    hypr_transcribe_aws::TranscribeService::new(config.clone())
        .await
        .map_err(|e| anyhow::anyhow!("Failed to create AWS service: {}", e))
}

async fn build_deepgram_service(
    config: &owhisper_config::DeepgramModelConfig,
) -> anyhow::Result<hypr_transcribe_deepgram::TranscribeService> {
    hypr_transcribe_deepgram::TranscribeService::new(config.clone())
        .await
        .map_err(|e| anyhow::anyhow!("Failed to create Deepgram service: {}", e))
}

fn build_whisper_cpp_service(
    config: &owhisper_config::WhisperCppModelConfig,
) -> anyhow::Result<hypr_transcribe_whisper_local::TranscribeService> {
    let mut files = std::fs::read_dir(&config.assets_dir)?;
    let model = files
        .find(|f| f.is_ok() && f.as_ref().unwrap().file_name() == "model.ggml")
        .ok_or(anyhow::anyhow!("model.ggml not found"))??;

    Ok(hypr_transcribe_whisper_local::TranscribeService::builder()
        .model_path(model.path())
        .build())
}

fn build_moonshine_service(
    config: &owhisper_config::MoonshineModelConfig,
) -> anyhow::Result<hypr_transcribe_moonshine::TranscribeService> {
    let mut files = std::fs::read_dir(&config.assets_dir)?;

    let tokenizer = files
        .find(|f| f.is_ok() && f.as_ref().unwrap().file_name() == "tokenizer.json")
        .ok_or(anyhow::anyhow!("tokenizer.json not found"))??;
    let encoder = files
        .find(|f| f.is_ok() && f.as_ref().unwrap().file_name() == "encoder_model.onnx")
        .ok_or(anyhow::anyhow!("encoder_model.onnx not found"))??;
    let decoder = files
        .find(|f| f.is_ok() && f.as_ref().unwrap().file_name() == "decoder_model_merged.onnx")
        .ok_or(anyhow::anyhow!("decoder_model_merged.onnx not found"))??;

    Ok(hypr_transcribe_moonshine::TranscribeService::builder()
        .model_size(config.size.clone())
        .tokenizer_path(tokenizer.path().to_str().unwrap().to_string())
        .encoder_path(encoder.path().to_str().unwrap().to_string())
        .decoder_path(decoder.path().to_str().unwrap().to_string())
        .build())
}

async fn handle_transcription(
    State(state): State<Arc<AppState>>,
    Query(params): Query<owhisper_interface::ListenParams>,
    req: Request,
) -> Result<Response, (StatusCode, String)> {
    let model_id = match params.model {
        Some(id) => id,
        None => state
            .services
            .keys()
            .next()
            .ok_or((StatusCode::NOT_FOUND, "no_model_specified".to_string()))?
            .clone(),
    };

    let service = state.services.get(&model_id).ok_or((
        StatusCode::NOT_FOUND,
        format!("no_model_match: {}", model_id),
    ))?;

    let response = match service {
        TranscriptionService::Aws(svc) => {
            let mut svc_clone = svc.clone();
            svc_clone.call(req).await.map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "aws_server_error".to_string(),
                )
            })
        }
        TranscriptionService::Deepgram(svc) => {
            let mut svc_clone = svc.clone();
            svc_clone.call(req).await.map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "deepgram_server_error".to_string(),
                )
            })
        }
        TranscriptionService::WhisperCpp(svc) => {
            let mut svc_clone = svc.clone();
            svc_clone.call(req).await.map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "whisper_cpp_server_error".to_string(),
                )
            })
        }
        TranscriptionService::Moonshine(svc) => {
            let mut svc_clone = svc.clone();
            svc_clone.call(req).await.map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "moonshine_server_error".to_string(),
                )
            })
        }
    }?;

    let (mut parts, body) = response.into_parts();
    let request_id = uuid::Uuid::new_v4().to_string();
    parts.headers.insert(
        "dg-request-id",
        axum::http::HeaderValue::from_str(&request_id).unwrap(),
    );

    Ok(Response::from_parts(parts, body))
}

async fn health() -> &'static str {
    "OK"
}

#[derive(serde::Serialize)]
struct ModelInfo {
    id: String,
    object: String,
}

#[derive(serde::Serialize)]
struct ModelsResponse {
    object: String,
    data: Vec<ModelInfo>,
}

async fn list_models(State(state): State<Arc<AppState>>) -> axum::Json<ModelsResponse> {
    let models: Vec<ModelInfo> = state
        .services
        .keys()
        .map(|id| ModelInfo {
            id: id.clone(),
            object: "model".to_string(),
        })
        .collect();

    axum::Json(ModelsResponse {
        object: "list".to_string(),
        data: models,
    })
}

async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    token_header: Option<TypedHeader<Authorization<Token>>>,
    bearer_header: Option<TypedHeader<Authorization<Bearer>>>,
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

    if let Some(TypedHeader(Authorization(token))) = token_header {
        if token.token() == expected_token {
            return Ok(next.run(req).await);
        } else {
            return Err(StatusCode::UNAUTHORIZED);
        }
    }

    if let Some(TypedHeader(Authorization(bearer))) = bearer_header {
        if bearer.token() == expected_token {
            return Ok(next.run(req).await);
        } else {
            return Err(StatusCode::UNAUTHORIZED);
        }
    }

    Err(StatusCode::UNAUTHORIZED)
}

pub struct Token(String);

impl Token {
    pub fn token(&self) -> &str {
        &self.0
    }
}

impl Credentials for Token {
    const SCHEME: &'static str = "Token";

    fn decode(value: &HeaderValue) -> Option<Self> {
        let bytes = value.as_bytes();
        if bytes.len() > "Token ".len() && &bytes[.."Token ".len()] == b"Token " {
            let token_bytes = &bytes["Token ".len()..];
            String::from_utf8(token_bytes.to_vec())
                .ok()
                .map(|s| Token(s.trim().to_string()))
        } else {
            None
        }
    }

    fn encode(&self) -> HeaderValue {
        HeaderValue::from_str(&format!("Token {}", self.0)).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::misc::shutdown_signal;

    use futures_util::StreamExt;

    use hypr_audio_utils::AudioFormatExt;
    use owhisper_client::ListenClient;
    use owhisper_interface::ListenParams;

    async fn start() -> SocketAddr {
        let server = Server::new(
            owhisper_config::Config {
                models: vec![owhisper_config::ModelConfig::WhisperCpp(
                    owhisper_config::WhisperCppModelConfig {
                        id: "whisper_cpp".to_string(),
                        assets_dir: dirs::data_dir()
                            .unwrap()
                            .join("com.hyprnote.dev/stt/ggml-small-q8_0.bin")
                            .to_str()
                            .unwrap()
                            .to_string(),
                    },
                )],
                ..Default::default()
            },
            None,
        );

        let router = server.build_router().await.unwrap();
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            let handle = axum::serve(listener, router.into_make_service())
                .with_graceful_shutdown(shutdown_signal());
            let _ = handle.await;
        });

        addr
    }

    #[tokio::test]
    // cargo test -p owhisper-server test_whisper_cpp -- --nocapture
    async fn test_whisper_cpp() {
        let addr = start().await;

        let client = ListenClient::builder()
            .api_base(format!("http://{}", addr))
            .params(ListenParams {
                model: Some("whisper_cpp".to_string()),
                ..Default::default()
            })
            .build_single();

        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 512);

        let stream = client.from_realtime_audio(audio).await.unwrap();
        futures_util::pin_mut!(stream);

        while let Some(result) = stream.next().await {
            println!("{:?}", result);
        }
    }
}
