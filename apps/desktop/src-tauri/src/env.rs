#[derive(Debug, serde::Deserialize)]
pub struct ENV {
    #[cfg_attr(debug_assertions, serde(default))]
    pub sentry_dsn: String,
    #[cfg_attr(debug_assertions, serde(default))]
    pub posthog_api_key: String,
}

pub fn load() -> ENV {
    envy::from_env::<ENV>().unwrap()
}
