use async_trait::async_trait;
use hypr_oauth_core::{OAuthConfig, OAuthProvider, TokenResponse};
use url::Url;

pub struct AttioProvider {}

#[async_trait]
impl OAuthProvider for AttioProvider {
    fn name(&self) -> &'static str {
        "attio"
    }

    fn build_auth_url(
        &self,
        config: &OAuthConfig,
        state: &str,
        pkce_challenge: Option<&str>,
    ) -> Result<Url, anyhow::Error> {
        // TODO: Implement Attio OAuth URL building
        todo!("Implement Attio OAuth URL building")
    }

    async fn exchange_code(
        &self,
        code: &str,
        config: &OAuthConfig,
        pkce_verifier: Option<&str>,
    ) -> Result<TokenResponse, anyhow::Error> {
        // TODO: Implement Attio code exchange
        todo!("Implement Attio code exchange")
    }

    async fn refresh_token(
        &self,
        refresh_token: &str,
        config: &OAuthConfig,
    ) -> Result<TokenResponse, anyhow::Error> {
        // TODO: Implement Attio token refresh
        todo!("Implement Attio token refresh")
    }
}
