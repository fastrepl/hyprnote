mod error;
mod types;

pub use error::Error;
pub use types::*;

use std::sync::Arc;
use std::time::Duration;

use moka::future::Cache;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct FlagClient {
    client: reqwest::Client,
    api_key: String,
    cache: Cache<String, FlagsResponse>,
    stale_cache: Arc<RwLock<std::collections::HashMap<String, FlagsResponse>>>,
}

impl FlagClient {
    pub fn new(api_key: impl Into<String>) -> Self {
        let client = {
            let d = Duration::from_secs(10);
            reqwest::Client::builder().timeout(d).build().unwrap()
        };

        let cache = {
            let d = Duration::from_secs(100);
            Cache::builder().time_to_live(d).build()
        };

        Self {
            client,
            api_key: api_key.into(),
            cache,
            stale_cache: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }

    fn build_cache_key(distinct_id: &str, options: &Option<FlagOptions>) -> String {
        match options {
            Some(opts) => {
                let opts_hash = serde_json::to_string(opts).unwrap_or_default();
                format!("{}:{}", distinct_id, opts_hash)
            }
            None => distinct_id.to_string(),
        }
    }

    pub async fn get_flags(
        &self,
        distinct_id: &str,
        options: Option<FlagOptions>,
    ) -> Result<FlagsResponse, Error> {
        let cache_key = Self::build_cache_key(distinct_id, &options);

        if let Some(cached) = self.cache.get(&cache_key).await {
            return Ok(cached);
        }

        let response = self.fetch_flags(distinct_id, options).await?;
        self.cache.insert(cache_key.clone(), response.clone()).await;
        self.stale_cache
            .write()
            .await
            .insert(cache_key, response.clone());
        Ok(response)
    }

    /// Try to get flags without blocking. Returns cached value immediately if available
    /// (even if stale), and triggers a background refresh if the cache has expired.
    /// Returns None only if no cached value exists at all.
    pub async fn try_get_flags(
        &self,
        distinct_id: &str,
        options: Option<FlagOptions>,
    ) -> Option<FlagsResponse> {
        let cache_key = Self::build_cache_key(distinct_id, &options);

        // First check the fresh cache
        if let Some(cached) = self.cache.get(&cache_key).await {
            return Some(cached);
        }

        // Check stale cache and trigger background refresh
        let stale_value = self.stale_cache.read().await.get(&cache_key).cloned();

        if stale_value.is_some() {
            // Trigger background refresh
            let client = self.clone();
            let distinct_id = distinct_id.to_string();
            tokio::spawn(async move {
                if let Ok(response) = client.fetch_flags(&distinct_id, options).await {
                    let key = Self::build_cache_key(&distinct_id, &None);
                    client.cache.insert(key.clone(), response.clone()).await;
                    client.stale_cache.write().await.insert(key, response);
                }
            });
        }

        stale_value
    }

    async fn fetch_flags(
        &self,
        distinct_id: &str,
        options: Option<FlagOptions>,
    ) -> Result<FlagsResponse, Error> {
        let options = options.unwrap_or_default();

        let mut body = serde_json::json!({
            "api_key": self.api_key,
            "distinct_id": distinct_id,
        });

        if let Some(groups) = &options.groups {
            body["groups"] = serde_json::json!(groups);
        }

        if let Some(person_properties) = &options.person_properties {
            body["person_properties"] = serde_json::json!(person_properties);
        }

        if let Some(group_properties) = &options.group_properties {
            body["group_properties"] = serde_json::json!(group_properties);
        }

        let response = self
            .client
            .post("https://us.i.posthog.com/flags?v=2")
            .json(&body)
            .send()
            .await?
            .error_for_status()?;

        let raw: RawFlagsResponse = response.json().await?;

        if raw.errors_while_computing_flags {
            return Err(Error::ComputeError);
        }

        Ok(FlagsResponse::new(raw))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[ignore]
    #[tokio::test]
    async fn test_get_flags() {
        let client = FlagClient::new("test_api_key");
        let result = client.get_flags("test_user", None).await;
        println!("{:?}", result);
    }
}
