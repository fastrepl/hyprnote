use async_trait::async_trait;
use hypr_oauth_core::{OAuthConfig, OAuthProvider, TokenResponse};
use url::Url;

pub struct SlackProvider {}

#[async_trait]
impl OAuthProvider for SlackProvider {
    fn name(&self) -> &'static str {
        "slack"
    }

    fn build_auth_url(
        &self,
        config: &OAuthConfig,
        state: &str,
        pkce_challenge: Option<&str>,
    ) -> Result<Url, anyhow::Error> {
        // TODO: Implement Slack OAuth URL building
        todo!("Implement Slack OAuth URL building")
    }

    async fn exchange_code(
        &self,
        code: &str,
        config: &OAuthConfig,
        pkce_verifier: Option<&str>,
    ) -> Result<TokenResponse, anyhow::Error> {
        // TODO: Implement Slack code exchange
        todo!("Implement Slack code exchange")
    }

    async fn refresh_token(
        &self,
        refresh_token: &str,
        config: &OAuthConfig,
    ) -> Result<TokenResponse, anyhow::Error> {
        // TODO: Implement Slack token refresh
        todo!("Implement Slack token refresh")
    }
}
