use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub enum OAuthError {
    ProviderNotFound,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthConfig {
    pub client_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_secret: Option<String>,
    pub redirect_uri: String,
    pub scopes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthRequest {
    pub provider: String,
    pub config: OAuthConfig,
    pub state: Option<String>,
    pub pkce_challenge: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthResponse {
    pub authorization_url: String,
    pub state: String,
    pub session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallbackRequest {
    pub code: String,
    pub state: String,
    pub session_id: Option<String>,
    pub pkce_verifier: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: Option<i64>,
    pub token_type: String,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}
