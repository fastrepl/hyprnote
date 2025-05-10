pub fn load() -> ENV {
    #[cfg(debug_assertions)]
    dotenv::from_filename(".env.local").unwrap();

    envy::from_env::<ENV>().unwrap()
}

#[derive(Debug, serde::Deserialize)]
pub struct ENV {
    pub sentry_dsn: String,
    pub turso_api_key: String,
    pub turso_org_slug: String,
    pub clerk_secret_key: String,
    pub deepgram_api_key: String,
    pub clova_api_key: String,
    pub turso_admin_db_name: String,
    pub nango_api_base: String,
    pub nango_api_key: String,
    pub posthog_api_key: String,
    pub s3_endpoint_url: String,
    pub s3_bucket_name: String,
    pub s3_access_key_id: String,
    pub s3_secret_access_key: String,
    pub openai_api_key: String,
    pub openai_api_base: String,
    pub stripe_secret_key: String,
    pub stripe_webhook_signing_secret: String,
    pub app_static_dir: String,
    #[serde(default = "default_port")]
    pub port: String,
}

fn default_port() -> String {
    "1234".to_string()
}
