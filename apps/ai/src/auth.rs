use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::{
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
};
use jsonwebtoken::{DecodingKey, Validation, decode, decode_header, jwk::JwkSet};
use serde::Deserialize;
use tokio::sync::RwLock;

use crate::env::env;

const ENTITLEMENT_PRO: &str = "hyprnote_pro";
const JWKS_CACHE_TTL: Duration = Duration::from_secs(5 * 60);

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: String,
    pub entitlements: Vec<String>,
}

impl AuthUser {
    pub fn is_pro(&self) -> bool {
        self.entitlements.iter().any(|e| e == ENTITLEMENT_PRO)
    }
}

#[derive(Debug, Deserialize)]
struct Claims {
    sub: String,
    #[serde(default)]
    entitlements: Vec<String>,
}

enum JwksState {
    Available(JwkSet),
    Empty,
}

struct CachedJwks {
    state: JwksState,
    fetched_at: Instant,
}

static JWKS_CACHE: std::sync::OnceLock<Arc<RwLock<Option<CachedJwks>>>> =
    std::sync::OnceLock::new();

fn jwks_cache() -> &'static Arc<RwLock<Option<CachedJwks>>> {
    JWKS_CACHE.get_or_init(|| Arc::new(RwLock::new(None)))
}

async fn get_jwks() -> Result<JwksState, &'static str> {
    let cache = jwks_cache();

    {
        let guard = cache.read().await;
        if let Some(cached) = guard.as_ref() {
            if cached.fetched_at.elapsed() < JWKS_CACHE_TTL {
                return Ok(match &cached.state {
                    JwksState::Available(jwks) => JwksState::Available(jwks.clone()),
                    JwksState::Empty => JwksState::Empty,
                });
            }
        }
    }

    let env = env();
    let jwks_url = format!("{}/auth/v1/.well-known/jwks.json", env.supabase_url);

    let jwks: JwkSet = reqwest::get(&jwks_url)
        .await
        .map_err(|_| "failed to fetch jwks")?
        .json()
        .await
        .map_err(|_| "failed to parse jwks")?;

    let state = if jwks.keys.is_empty() {
        JwksState::Empty
    } else {
        JwksState::Available(jwks)
    };

    {
        let mut guard = cache.write().await;
        *guard = Some(CachedJwks {
            state: match &state {
                JwksState::Available(jwks) => JwksState::Available(jwks.clone()),
                JwksState::Empty => JwksState::Empty,
            },
            fetched_at: Instant::now(),
        });
    }

    Ok(state)
}

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "missing authorization header"))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .or_else(|| auth_header.strip_prefix("bearer "))
            .ok_or((StatusCode::UNAUTHORIZED, "invalid authorization header"))?;

        let jwks_state = get_jwks()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

        let jwks = match jwks_state {
            JwksState::Empty => {
                if cfg!(debug_assertions) {
                    tracing::warn!(
                        target: "security",
                        "JWKS empty in debug build: accepting unsigned token"
                    );
                    let claims = decode_claims_insecure(token)
                        .map_err(|_| (StatusCode::UNAUTHORIZED, "invalid token"))?;
                    return Ok(AuthUser {
                        user_id: claims.sub,
                        entitlements: claims.entitlements,
                    });
                }
                tracing::error!(
                    target: "security",
                    "JWKS empty in release build: rejecting request"
                );
                return Err((StatusCode::UNAUTHORIZED, "authentication unavailable"));
            }
            JwksState::Available(jwks) => jwks,
        };

        let header =
            decode_header(token).map_err(|_| (StatusCode::UNAUTHORIZED, "invalid token header"))?;

        let kid = header
            .kid
            .as_ref()
            .ok_or((StatusCode::UNAUTHORIZED, "missing kid in token"))?;

        let jwk = jwks
            .find(kid)
            .ok_or((StatusCode::UNAUTHORIZED, "unknown signing key"))?;

        let key = DecodingKey::from_jwk(jwk)
            .map_err(|_| (StatusCode::UNAUTHORIZED, "invalid signing key"))?;

        let alg = jwk
            .common
            .key_algorithm
            .and_then(|a| a.to_string().parse().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "unsupported algorithm"))?;

        let mut validation = Validation::new(alg);
        validation.set_audience(&["authenticated"]);
        validation.validate_exp = true;

        let token_data = decode::<Claims>(token, &key, &validation)
            .map_err(|_| (StatusCode::UNAUTHORIZED, "invalid token"))?;

        Ok(AuthUser {
            user_id: token_data.claims.sub,
            entitlements: token_data.claims.entitlements,
        })
    }
}

fn decode_claims_insecure(token: &str) -> Result<Claims, ()> {
    jsonwebtoken::dangerous::insecure_decode::<Claims>(token)
        .map(|data| data.claims)
        .map_err(|_| ())
}
