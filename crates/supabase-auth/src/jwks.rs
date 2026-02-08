use std::sync::Arc;
use std::time::{Duration, Instant};

use jsonwebtoken::jwk::JwkSet;
use tokio::sync::RwLock;

use crate::error::{Error, JwksFetchError};

/// Duration to cache JWKS before refetching (10 minutes).
const CACHE_DURATION: Duration = Duration::from_secs(600);

/// Internal cache structure holding JWKS and fetch timestamp.
struct JwksCache {
    jwks: Option<JwkSet>,
    fetched_at: Option<Instant>,
}

impl JwksCache {
    /// Creates a new empty cache.
    const fn new() -> Self {
        Self {
            jwks: None,
            fetched_at: None,
        }
    }

    /// Checks if the cached JWKS is still valid based on age.
    fn is_valid(&self) -> bool {
        match (&self.jwks, self.fetched_at) {
            (Some(_), Some(fetched_at)) => fetched_at.elapsed() < CACHE_DURATION,
            _ => false,
        }
    }

    /// Updates the cache with new JWKS and current timestamp.
    fn update(&mut self, jwks: JwkSet) {
        self.jwks = Some(jwks);
        self.fetched_at = Some(Instant::now());
    }

    /// Retrieves the cached JWKS if valid.
    fn get(&self) -> Option<&JwkSet> {
        if self.is_valid() {
            self.jwks.as_ref()
        } else {
            None
        }
    }
}

/// Thread-safe cached JWKS fetcher with automatic refresh.
///
/// This structure handles fetching and caching of JSON Web Key Sets (JWKS)
/// from Supabase with automatic cache invalidation after a configured duration.
#[derive(Clone)]
pub(crate) struct CachedJwks {
    url: String,
    cache: Arc<RwLock<JwksCache>>,
    http_client: reqwest::Client,
}

impl CachedJwks {
    /// Creates a new JWKS cache with the given endpoint URL.
    pub fn new(url: String) -> Self {
        Self {
            url,
            cache: Arc::new(RwLock::new(JwksCache::new())),
            http_client: reqwest::Client::new(),
        }
    }

    /// Retrieves the JWKS, fetching from the server if cache is invalid.
    ///
    /// This method uses double-checked locking to minimize lock contention:
    /// 1. First checks with read lock if cache is valid
    /// 2. If invalid, acquires write lock and checks again (another thread might have updated)
    /// 3. Fetches fresh JWKS if still invalid
    pub async fn get(&self) -> Result<JwkSet, Error> {
        // Fast path: check cache with read lock
        {
            let cache = self.cache.read().await;
            if let Some(jwks) = cache.get() {
                return Ok(jwks.clone());
            }
        }

        // Slow path: fetch with write lock (double-check after acquiring lock)
        let mut cache = self.cache.write().await;

        // Check again in case another thread updated while we waited for write lock
        if let Some(jwks) = cache.get() {
            return Ok(jwks.clone());
        }

        let jwks = self.fetch_jwks().await?;
        cache.update(jwks.clone());

        Ok(jwks)
    }

    /// Fetches JWKS from the remote endpoint.
    async fn fetch_jwks(&self) -> Result<JwkSet, Error> {
        let response = self
            .http_client
            .get(&self.url)
            .send()
            .await
            .map_err(|e| JwksFetchError::NetworkError(e.to_string()))?;

        let jwks = response
            .json::<JwkSet>()
            .await
            .map_err(|e| JwksFetchError::ParseError(e.to_string()))?;

        Ok(jwks)
    }
}
