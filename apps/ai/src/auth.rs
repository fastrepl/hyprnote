use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use jsonwebtoken::{Algorithm, DecodingKey, Validation, jwk::JwkSet};
use serde::Deserialize;
use tokio::sync::RwLock;

const JWKS_CACHE_DURATION: Duration = Duration::from_secs(600);
const PRO_ENTITLEMENT: &str = "hyprnote_pro";

#[derive(Debug, Deserialize)]
struct Claims {
    #[serde(default)]
    entitlements: Vec<String>,
}

struct JwksCache {
    jwks: Option<JwkSet>,
    fetched_at: Option<Instant>,
}

impl JwksCache {
    fn new() -> Self {
        Self {
            jwks: None,
            fetched_at: None,
        }
    }

    fn is_valid(&self) -> bool {
        self.jwks.is_some()
            && self
                .fetched_at
                .map(|t| t.elapsed() < JWKS_CACHE_DURATION)
                .unwrap_or(false)
    }
}

#[derive(Clone)]
pub struct AuthState {
    jwks_url: String,
    cache: Arc<RwLock<JwksCache>>,
    http_client: reqwest::Client,
}

impl AuthState {
    pub fn new(supabase_url: &str) -> Self {
        let jwks_url = format!(
            "{}/auth/v1/.well-known/jwks.json",
            supabase_url.trim_end_matches('/')
        );
        Self {
            jwks_url,
            cache: Arc::new(RwLock::new(JwksCache::new())),
            http_client: reqwest::Client::new(),
        }
    }

    async fn get_jwks(&self) -> Result<JwkSet, AuthError> {
        {
            let cache = self.cache.read().await;
            if cache.is_valid() {
                return Ok(cache.jwks.clone().unwrap());
            }
        }

        let mut cache = self.cache.write().await;
        if cache.is_valid() {
            return Ok(cache.jwks.clone().unwrap());
        }

        let jwks: JwkSet = self
            .http_client
            .get(&self.jwks_url)
            .send()
            .await
            .map_err(|_| AuthError::JwksFetchFailed)?
            .json()
            .await
            .map_err(|_| AuthError::JwksFetchFailed)?;

        cache.jwks = Some(jwks.clone());
        cache.fetched_at = Some(Instant::now());

        Ok(jwks)
    }
}

#[derive(Debug)]
pub enum AuthError {
    MissingAuthHeader,
    InvalidAuthHeader,
    JwksFetchFailed,
    InvalidToken,
    NotPro,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AuthError::MissingAuthHeader => {
                (StatusCode::UNAUTHORIZED, "missing_authorization_header")
            }
            AuthError::InvalidAuthHeader => {
                (StatusCode::UNAUTHORIZED, "invalid_authorization_header")
            }
            AuthError::JwksFetchFailed => (StatusCode::INTERNAL_SERVER_ERROR, "jwks_fetch_failed"),
            AuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "invalid_token"),
            AuthError::NotPro => (StatusCode::FORBIDDEN, "subscription_required"),
        };
        (status, message).into_response()
    }
}

fn extract_token(auth_header: &str) -> Option<&str> {
    auth_header
        .strip_prefix("Bearer ")
        .or_else(|| auth_header.strip_prefix("bearer "))
}

fn decode_jwt_unverified_header(token: &str) -> Result<jsonwebtoken::Header, AuthError> {
    jsonwebtoken::decode_header(token).map_err(|_| AuthError::InvalidToken)
}

pub async fn require_pro(
    State(state): State<AuthState>,
    request: Request,
    next: Next,
) -> Result<Response, AuthError> {
    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(AuthError::MissingAuthHeader)?;

    let token = extract_token(auth_header).ok_or(AuthError::InvalidAuthHeader)?;
    let header = decode_jwt_unverified_header(token)?;

    let jwks = state.get_jwks().await?;

    let kid = header.kid.as_deref().ok_or(AuthError::InvalidToken)?;
    let jwk = jwks.find(kid).ok_or(AuthError::InvalidToken)?;

    let algorithm = match jwk.common.key_algorithm {
        Some(jsonwebtoken::jwk::KeyAlgorithm::RS256) => Algorithm::RS256,
        Some(jsonwebtoken::jwk::KeyAlgorithm::ES256) => Algorithm::ES256,
        _ => return Err(AuthError::InvalidToken),
    };

    let decoding_key = DecodingKey::from_jwk(jwk).map_err(|_| AuthError::InvalidToken)?;

    let mut validation = Validation::new(algorithm);
    validation.validate_exp = true;

    let token_data = jsonwebtoken::decode::<Claims>(token, &decoding_key, &validation)
        .map_err(|_| AuthError::InvalidToken)?;

    if !token_data
        .claims
        .entitlements
        .contains(&PRO_ENTITLEMENT.to_string())
    {
        return Err(AuthError::NotPro);
    }

    Ok(next.run(request).await)
}
