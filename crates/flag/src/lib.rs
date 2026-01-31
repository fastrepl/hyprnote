mod cache;
mod error;
mod types;

pub use error::Error;
pub use types::*;

use std::time::Duration;

use cache::SwrCache;

#[derive(Clone)]
pub struct FlagClient {
    client: reqwest::Client,
    api_key: String,
    cache: SwrCache<String, FlagsResponse>,
}

impl FlagClient {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self::with_cache_ttls(api_key, Duration::from_secs(10), Duration::from_secs(3600))
    }

    pub fn with_cache_ttls(
        api_key: impl Into<String>,
        fresh_ttl: Duration,
        stale_ttl: Duration,
    ) -> Self {
        let client = {
            let d = Duration::from_secs(10);
            reqwest::Client::builder().timeout(d).build().unwrap()
        };

        let cache = SwrCache::new(fresh_ttl, stale_ttl);

        Self {
            client,
            api_key: api_key.into(),
            cache,
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

        let client = self.clone();
        let distinct_id = distinct_id.to_string();
        let options_clone = options.clone();

        let result = self
            .cache
            .get_with(cache_key, |_| async move {
                client.fetch_flags(&distinct_id, options_clone).await.ok()
            })
            .await;

        result.ok_or(Error::ComputeError)
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

        let client = self.clone();
        let distinct_id = distinct_id.to_string();
        let options_clone = options.clone();

        self.cache
            .get_with_swr(cache_key, |_| async move {
                client.fetch_flags(&distinct_id, options_clone).await.ok()
            })
            .await
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
