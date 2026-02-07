use std::sync::Arc;

#[derive(Clone)]
pub struct IntegrationConfig {
    pub nango_api_base: String,
    pub nango_api_key: String,
    pub nango_webhook_secret: String,
    pub auth: Option<Arc<hypr_supabase_auth::SupabaseAuth>>,
}

impl IntegrationConfig {
    pub fn new(
        nango_api_base: impl Into<String>,
        nango_api_key: impl Into<String>,
        nango_webhook_secret: impl Into<String>,
    ) -> Self {
        Self {
            nango_api_base: nango_api_base.into(),
            nango_api_key: nango_api_key.into(),
            nango_webhook_secret: nango_webhook_secret.into(),
            auth: None,
        }
    }

    pub fn with_auth(mut self, auth: Arc<hypr_supabase_auth::SupabaseAuth>) -> Self {
        self.auth = Some(auth);
        self
    }
}
