use octocrab::Octocrab;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

use crate::config::SupportConfig;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) config: SupportConfig,
    pub(crate) octocrab: Octocrab,
    pub(crate) db_pool: PgPool,
}

impl AppState {
    pub(crate) async fn new(config: SupportConfig) -> Self {
        let key = jsonwebtoken::EncodingKey::from_rsa_pem(
            config
                .github
                .github_bot_private_key
                .replace("\\n", "\n")
                .as_bytes(),
        )
        .expect("invalid GitHub App private key");

        let octocrab = Octocrab::builder()
            .app(config.github.github_bot_app_id.into(), key)
            .build()
            .expect("failed to build octocrab client");

        let db_pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(&config.supabase_db.supabase_db_url)
            .await
            .expect("failed to connect to Supabase Postgres");

        Self {
            config,
            octocrab,
            db_pool,
        }
    }

    pub(crate) async fn installation_client(&self) -> Result<Octocrab, octocrab::Error> {
        self.octocrab
            .installation(self.config.github.github_bot_installation_id.into())
    }
}
