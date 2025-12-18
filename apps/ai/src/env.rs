use std::collections::HashMap;
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
        let _ = dotenvy::dotenv();
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
        let api_keys = providers
            .into_iter()
            .map(|p| (p, required(p.env_key_name())))
            .collect();

        Self {
            port: parse_or("PORT", 3000),
            sentry_dsn: optional("SENTRY_DSN"),
            supabase_url: required("SUPABASE_URL"),
            openrouter_api_key: required("OPENROUTER_API_KEY"),
            api_keys,
        }
    }

    pub fn api_key_for(&self, provider: Provider) -> String {
        self.api_keys
            .get(&provider)
            .cloned()
            .unwrap_or_else(|| panic!("{} is not configured", provider.env_key_name()))
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
