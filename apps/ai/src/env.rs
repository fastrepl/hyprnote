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

    #[serde(flatten)]
    pub supabase: hypr_api_env::SupabaseEnv,
    #[serde(flatten)]
    pub nango: hypr_api_env::NangoEnv,
    #[serde(flatten)]
    pub stripe: hypr_api_subscription::StripeEnv,

    #[serde(flatten)]
    pub llm: hypr_llm_proxy::Env,
    #[serde(flatten)]
    pub stt: hypr_transcribe_proxy::Env,

    #[serde(default, deserialize_with = "filter_empty")]
    pub charlie_app_id: Option<String>,
    #[serde(default, deserialize_with = "filter_empty")]
    pub charlie_app_private_key: Option<String>,
    #[serde(default, deserialize_with = "filter_empty")]
    pub charlie_app_installation_id: Option<String>,
    #[serde(default, deserialize_with = "filter_empty")]
    pub openrouter_api_key: Option<String>,
}

static ENV: OnceLock<Env> = OnceLock::new();

pub fn env() -> &'static Env {
    ENV.get_or_init(|| {
        let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
        let repo_root = manifest_dir
            .parent()
            .and_then(|p| p.parent())
            .unwrap_or(manifest_dir);

        let _ = dotenvy::from_path(repo_root.join(".env.supabase"));
        let _ = dotenvy::from_path(manifest_dir.join(".env"));
        envy::from_env().expect("Failed to load environment")
    })
}
