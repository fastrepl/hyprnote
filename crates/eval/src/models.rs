use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use serde::Deserialize;
use ureq::Agent;

const MODEL_CACHE_DURATION_SECS: u64 = 300;

#[derive(Debug, Deserialize)]
pub struct OpenRouterModel {
    pub id: String,
    #[allow(dead_code)]
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct OpenRouterModelsResponse {
    pub data: Vec<OpenRouterModel>,
}

/// Cached model list with expiration tracking.
struct ModelCache {
    models: Vec<String>,
    fetched_at: Instant,
}

impl ModelCache {
    fn is_valid(&self) -> bool {
        self.fetched_at.elapsed() < Duration::from_secs(MODEL_CACHE_DURATION_SECS)
    }
}

static MODEL_CACHE: OnceLock<Mutex<ModelCache>> = OnceLock::new();

fn get_cached_models() -> Option<Vec<String>> {
    let cache = MODEL_CACHE.get()?;
    let guard = cache.lock().ok()?;
    if guard.is_valid() {
        Some(guard.models.clone())
    } else {
        None
    }
}

fn set_cached_models(models: Vec<String>) {
    if let Some(cache) = MODEL_CACHE.get() {
        if let Ok(mut guard) = cache.lock() {
            guard.models = models;
            guard.fetched_at = Instant::now();
        }
    }
}

pub fn fetch_openrouter_models() -> Result<Vec<String>, crate::ClientError> {
    MODEL_CACHE.get_or_init(|| {
        Mutex::new(ModelCache {
            models: Vec::new(),
            fetched_at: Instant::now() - Duration::from_secs(MODEL_CACHE_DURATION_SECS + 1),
        })
    });

    if let Some(models) = get_cached_models() {
        return Ok(models);
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

    set_cached_models(models.clone());

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
