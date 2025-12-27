use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use serde::Deserialize;
use ureq::Agent;

const MODEL_CACHE_DURATION_SECS: u64 = 300;

#[derive(Debug, Deserialize)]
pub struct OpenRouterModel {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct OpenRouterModelsResponse {
    pub data: Vec<OpenRouterModel>,
}

struct ModelCache {
    models: Vec<String>,
    fetched_at: Instant,
}

static MODEL_CACHE: OnceLock<Mutex<Option<ModelCache>>> = OnceLock::new();

pub fn fetch_openrouter_models() -> Result<Vec<String>, crate::ClientError> {
    let cache = MODEL_CACHE.get_or_init(|| Mutex::new(None));

    if let Ok(guard) = cache.lock() {
        if let Some(ref cached) = *guard {
            if cached.fetched_at.elapsed() < Duration::from_secs(MODEL_CACHE_DURATION_SECS) {
                return Ok(cached.models.clone());
            }
        }
    }

    let api_key = std::env::var("OPENROUTER_API_KEY").unwrap_or_default();

    let agent: Agent = Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(10)))
        .build()
        .into();

    let mut request = agent.get("https://openrouter.ai/api/v1/models");

    if !api_key.is_empty() {
        request = request.header("Authorization", &format!("Bearer {}", api_key));
    }

    let response = request.call()?;

    let body = response.into_body().read_to_string()?;

    let models_resp: OpenRouterModelsResponse = serde_json::from_str(&body)?;

    let mut models: Vec<String> = models_resp.data.into_iter().map(|m| m.id).collect();
    models.sort();

    if let Ok(mut guard) = cache.lock() {
        *guard = Some(ModelCache {
            models: models.clone(),
            fetched_at: Instant::now(),
        });
    }

    Ok(models)
}

pub fn filter_models(models: &[String], prefix: &str) -> Vec<String> {
    if prefix.is_empty() {
        return models.to_vec();
    }

    models
        .iter()
        .filter(|m| m.starts_with(prefix))
        .cloned()
        .collect()
}
