use futures_util::task::Poll;
use futures_util::Future;
use hypr_oauth_core::{OAuthError, OAuthRequest, OAuthResponse};
use hypr_oauth_providers::ProviderRegistry;
use std::pin::Pin;
use std::sync::Arc;
use std::task::Context;
use tower::Service;

#[derive(Clone)]
pub struct OAuthServerService {
    providers: Arc<ProviderRegistry>,
    secret_store: Arc<dyn SecretStore>,
}

pub trait SecretStore: Send + Sync {
    fn get_client_secret(&self, provider: &str) -> Option<String>;
}

impl OAuthServerService {
    pub fn new(providers: Arc<ProviderRegistry>, secret_store: Arc<dyn SecretStore>) -> Self {
        Self {
            providers,
            secret_store,
        }
    }
}

impl Service<OAuthRequest> for OAuthServerService {
    type Response = OAuthResponse;
    type Error = OAuthError;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, mut req: OAuthRequest) -> Self::Future {
        let providers = self.providers.clone();
        let secret_store = self.secret_store.clone();

        Box::pin(async move {
            let provider = providers
                .get(&req.provider)
                .ok_or(OAuthError::ProviderNotFound)?;

            // Add client secret if needed
            if provider.metadata().requires_client_secret {
                req.config.client_secret = secret_store.get_client_secret(&req.provider);
            }

            // Generate state
            let state = req
                .state
                .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

            // Build auth URL
            let auth_url = provider
                .build_auth_url(&req.config, &state, req.pkce_challenge.as_deref())
                .unwrap();

            Ok(OAuthResponse {
                authorization_url: auth_url.to_string(),
                state,
                session_id: Some(uuid::Uuid::new_v4().to_string()),
            })
        })
    }
}
