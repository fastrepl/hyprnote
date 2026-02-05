use std::path::Path;
use std::sync::OnceLock;

use serde::Deserialize;

fn default_port() -> u16 {
    3001
}

fn filter_empty<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: Option<String> = Option::deserialize(deserializer)?;
    Ok(s.filter(|s| !s.is_empty()))
}

#[derive(Deserialize)]
pub struct Env {
    #[serde(default = "default_port")]
    pub port: u16,
    #[serde(default, deserialize_with = "filter_empty")]
    pub sentry_dsn: Option<String>,
    #[serde(default, deserialize_with = "filter_empty")]
    pub posthog_api_key: Option<String>,
    pub supabase_url: String,

    #[serde(flatten)]
    pub llm: hypr_llm_proxy::Env,
    #[serde(flatten)]
    pub stt: hypr_transcribe_proxy::Env,
}

static ENV: OnceLock<Env> = OnceLock::new();

pub fn env() -> &'static Env {
    ENV.get_or_init(|| {
        let _ = dotenvy::from_path(Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"));
        envy::from_env().expect("Failed to load environment")
    })
}
