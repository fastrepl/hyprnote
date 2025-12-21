use std::collections::HashMap;
use std::path::Path;
use std::sync::OnceLock;

use owhisper_providers::Provider;

pub struct Env {
    pub port: u16,
    pub sentry_dsn: Option<String>,
    pub supabase_url: String,
    pub openrouter_api_key: String,
    api_keys: HashMap<Provider, String>,
}

static ENV: OnceLock<Env> = OnceLock::new();

pub fn env() -> &'static Env {
    ENV.get_or_init(|| {
        let _ = dotenvy::from_path(Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"));
        Env::from_env()
    })
}

impl Env {
    fn from_env() -> Self {
        let providers = [
            Provider::Deepgram,
            Provider::AssemblyAI,
            Provider::Soniox,
            Provider::Fireworks,
            Provider::OpenAI,
            Provider::Gladia,
        ];
        let api_keys: HashMap<Provider, String> = providers
            .into_iter()
            .filter_map(|p| optional(p.env_key_name()).map(|key| (p, key)))
            .collect();

        Self {
            port: parse_or("PORT", 3001),
            sentry_dsn: optional("SENTRY_DSN"),
            supabase_url: required("SUPABASE_URL"),
            openrouter_api_key: required("OPENROUTER_API_KEY"),
            api_keys,
        }
    }

    pub fn api_keys(&self) -> HashMap<Provider, String> {
        self.api_keys.clone()
    }

    pub fn configured_providers(&self) -> Vec<Provider> {
        self.api_keys.keys().copied().collect()
    }

    pub fn log_configured_providers(&self) {
        let providers: Vec<_> = self.configured_providers();
        if providers.is_empty() {
            tracing::warn!("no STT providers configured");
        } else {
            let names: Vec<_> = providers.iter().map(|p| format!("{:?}", p)).collect();
            tracing::info!(providers = ?names, "STT providers configured");
        }
    }
}

fn required(key: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| panic!("{key} is required"))
}

fn optional(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|s| !s.is_empty())
}

fn parse_or<T: std::str::FromStr>(key: &str, default: T) -> T {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}
