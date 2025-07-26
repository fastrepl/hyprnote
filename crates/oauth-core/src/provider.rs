use async_trait::async_trait;
use url::Url;

use crate::types::*;

#[async_trait]
pub trait OAuthProvider: Send + Sync {
    fn name(&self) -> &'static str;

    fn build_auth_url(
        &self,
        config: &OAuthConfig,
        state: &str,
        pkce_challenge: Option<&str>,
    ) -> Result<Url, anyhow::Error>;

    async fn exchange_code(
        &self,
        code: &str,
        config: &OAuthConfig,
        pkce_verifier: Option<&str>,
    ) -> Result<TokenResponse, anyhow::Error>;

    async fn refresh_token(
        &self,
        refresh_token: &str,
        config: &OAuthConfig,
    ) -> Result<TokenResponse, anyhow::Error>;

    fn metadata(&self) -> ProviderMetadata {
        ProviderMetadata::default()
    }
}

#[derive(Debug, Clone, Default)]
pub struct ProviderMetadata {
    pub supports_pkce: bool,
    pub supports_refresh: bool,
    pub requires_client_secret: bool,
    pub auth_url: &'static str,
    pub token_url: &'static str,
}
