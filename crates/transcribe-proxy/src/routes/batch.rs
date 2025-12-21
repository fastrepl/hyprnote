use std::io::Write;
use std::str::FromStr;

use axum::{
    Json,
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
};

use owhisper_client::{
    AssemblyAIAdapter, BatchClient, DeepgramAdapter, GladiaAdapter, OpenAIAdapter, SonioxAdapter,
};
use owhisper_interface::ListenParams;
use owhisper_interface::batch::Response as BatchResponse;
use owhisper_providers::Provider;

use crate::query_params::{QueryParams, QueryValue};

use super::{AppState, ResolvedProvider};

pub async fn handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut params: QueryParams,
    body: Bytes,
) -> Response {
    let resolved = match state.resolve_provider(&mut params) {
        Ok(v) => v,
        Err(resp) => return resp,
    };

    if body.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "missing_audio_data",
                "detail": "Request body is empty"
            })),
        )
            .into_response();
    }

    let content_type = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream");

    let listen_params = build_listen_params(&params);

    tracing::info!(
        provider = ?resolved.provider(),
        content_type = %content_type,
        body_size = body.len(),
        "batch transcription request received"
    );

    match transcribe_with_provider(&resolved, listen_params, body, content_type).await {
        Ok(response) => Json(response).into_response(),
        Err(e) => {
            tracing::error!(error = %e, "batch transcription failed");
            (
                StatusCode::BAD_GATEWAY,
                Json(serde_json::json!({
                    "error": "transcription_failed",
                    "detail": e
                })),
            )
                .into_response()
        }
    }
}

fn build_listen_params(params: &QueryParams) -> ListenParams {
    let model = params.get_first("model").map(|s| s.to_string());

    let languages: Vec<hypr_language::Language> = params
        .get("language")
        .map(|v| {
            v.iter()
                .flat_map(|s| s.split(','))
                .filter_map(|lang| {
                    hypr_language::ISO639::from_str(lang.trim())
                        .ok()
                        .map(hypr_language::Language::from)
                })
                .collect()
        })
        .unwrap_or_default();

    let keywords: Vec<String> = params
        .get("keyword")
        .or_else(|| params.get("keywords"))
        .map(|v| match v {
            QueryValue::Single(s) => s.split(',').map(|k| k.trim().to_string()).collect(),
            QueryValue::Multi(vec) => vec.iter().map(|k| k.trim().to_string()).collect(),
        })
        .unwrap_or_default();

    ListenParams {
        model,
        languages,
        keywords,
        ..Default::default()
    }
}

async fn transcribe_with_provider(
    resolved: &ResolvedProvider,
    params: ListenParams,
    audio_bytes: Bytes,
    content_type: &str,
) -> Result<BatchResponse, String> {
    let temp_file = write_to_temp_file(&audio_bytes, content_type)
        .map_err(|e| format!("failed to create temp file: {}", e))?;

    let file_path = temp_file.path();
    let provider = resolved.provider();
    let api_base = provider.default_api_base();
    let api_key = resolved.api_key();

    let result = match provider {
        Provider::Deepgram => {
            BatchClient::<DeepgramAdapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        }
        Provider::AssemblyAI => {
            BatchClient::<AssemblyAIAdapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        }
        Provider::Soniox => {
            BatchClient::<SonioxAdapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        }
        Provider::OpenAI => {
            BatchClient::<OpenAIAdapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        }
        Provider::Gladia => {
            BatchClient::<GladiaAdapter>::builder()
                .api_base(api_base)
                .api_key(api_key)
                .params(params)
                .build()
                .transcribe_file(file_path)
                .await
        }
        Provider::Fireworks => {
            return Err(format!(
                "{:?} does not support batch transcription",
                provider
            ));
        }
    };

    result.map_err(|e| format!("{:?}", e))
}

fn write_to_temp_file(
    bytes: &Bytes,
    content_type: &str,
) -> Result<tempfile::NamedTempFile, std::io::Error> {
    let extension = content_type_to_extension(content_type);
    let mut temp_file = tempfile::Builder::new()
        .prefix("batch_audio_")
        .suffix(&format!(".{}", extension))
        .tempfile()?;

    temp_file.write_all(bytes)?;
    temp_file.flush()?;

    Ok(temp_file)
}

fn content_type_to_extension(content_type: &str) -> &'static str {
    let mime = content_type
        .split(';')
        .next()
        .unwrap_or(content_type)
        .trim();

    match mime {
        "audio/wav" | "audio/wave" | "audio/x-wav" => "wav",
        "audio/mpeg" | "audio/mp3" => "mp3",
        "audio/ogg" => "ogg",
        "audio/flac" => "flac",
        "audio/mp4" | "audio/m4a" | "audio/x-m4a" => "m4a",
        "audio/webm" => "webm",
        "audio/aac" => "aac",
        _ => "wav",
    }
}
