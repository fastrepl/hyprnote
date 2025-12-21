// Supabase JWT authentication utilities.
//
// References:
// - https://supabase.com/docs/guides/auth/jwts
// - https://supabase.com/docs/guides/auth/signing-keys

use std::sync::Arc;
use std::time::{Duration, Instant};

use jsonwebtoken::{Algorithm, DecodingKey, Validation, jwk::JwkSet};
use serde::Deserialize;
use tokio::sync::RwLock;

mod error;
pub use error::Error;

const JWKS_CACHE_DURATION: Duration = Duration::from_secs(600);

#[derive(Debug, Deserialize)]
pub struct Claims {
    #[serde(default)]
    pub entitlements: Vec<String>,
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
pub struct SupabaseAuth {
    jwks_url: String,
    cache: Arc<RwLock<JwksCache>>,
    http_client: reqwest::Client,
}

impl SupabaseAuth {
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

    async fn get_jwks(&self) -> Result<JwkSet, Error> {
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
            .map_err(|_| Error::JwksFetchFailed)?
            .json()
            .await
            .map_err(|_| Error::JwksFetchFailed)?;

        cache.jwks = Some(jwks.clone());
        cache.fetched_at = Some(Instant::now());

        Ok(jwks)
    }

    pub fn extract_token(auth_header: &str) -> Option<&str> {
        auth_header
            .strip_prefix("Bearer ")
            .or_else(|| auth_header.strip_prefix("bearer "))
    }

    pub async fn verify_token(&self, token: &str) -> Result<Claims, Error> {
        let header = jsonwebtoken::decode_header(token).map_err(|_| Error::InvalidToken)?;

        let jwks = self.get_jwks().await?;

        let kid = header.kid.as_deref().ok_or(Error::InvalidToken)?;
        let jwk = jwks.find(kid).ok_or(Error::InvalidToken)?;

        let algorithm = match jwk.common.key_algorithm {
            Some(jsonwebtoken::jwk::KeyAlgorithm::RS256) => Algorithm::RS256,
            Some(jsonwebtoken::jwk::KeyAlgorithm::ES256) => Algorithm::ES256,
            _ => return Err(Error::InvalidToken),
        };

        let decoding_key = DecodingKey::from_jwk(jwk).map_err(|_| Error::InvalidToken)?;

        let mut validation = Validation::new(algorithm);
        validation.validate_exp = true;

        let token_data = jsonwebtoken::decode::<Claims>(token, &decoding_key, &validation)
            .map_err(|_| Error::InvalidToken)?;

        Ok(token_data.claims)
    }

    pub async fn require_entitlement(
        &self,
        token: &str,
        entitlement: &str,
    ) -> Result<Claims, Error> {
        let claims = self.verify_token(token).await?;

        if !claims.entitlements.contains(&entitlement.to_string()) {
            return Err(Error::MissingEntitlement(entitlement.to_string()));
        }

        Ok(claims)
    }
}
