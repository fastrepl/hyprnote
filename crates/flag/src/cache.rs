use std::future::Future;
use std::time::Duration;

use moka::future::Cache;

/// A stale-while-revalidate (SWR) cache implementation using two moka caches.
///
/// The SWR pattern allows serving stale data immediately while fetching fresh data
/// in the background. This provides:
/// - Fast responses (no blocking on network calls)
/// - Always-available data (even if upstream is slow/down)
/// - Eventual consistency (data updates in background)
///
/// Implementation uses two caches:
/// - fresh_cache: Short TTL (default 10s) - represents "fresh" data
/// - stale_cache: Long TTL (default 1h) - represents "stale but usable" data
#[derive(Clone)]
pub struct SwrCache<K, V>
where
    K: std::hash::Hash + Eq + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
{
    fresh_cache: Cache<K, V>,
    stale_cache: Cache<K, V>,
    #[cfg(test)]
    fresh_ttl: Duration,
    #[cfg(test)]
    stale_ttl: Duration,
}

impl<K, V> SwrCache<K, V>
where
    K: std::hash::Hash + Eq + Send + Sync + Clone + 'static,
    V: Clone + Send + Sync + 'static,
{
    pub fn new(fresh_ttl: Duration, stale_ttl: Duration) -> Self {
        let fresh_cache = Cache::builder().time_to_live(fresh_ttl).build();
        let stale_cache = Cache::builder().time_to_live(stale_ttl).build();

        Self {
            fresh_cache,
            stale_cache,
            #[cfg(test)]
            fresh_ttl,
            #[cfg(test)]
            stale_ttl,
        }
    }

    /// Insert a value into both fresh and stale caches.
    pub async fn insert(&self, key: K, value: V) {
        self.fresh_cache.insert(key.clone(), value.clone()).await;
        self.stale_cache.insert(key, value).await;
    }

    /// Get a value from the cache, using SWR pattern.
    ///
    /// Returns:
    /// - `Some(value)` if data exists (fresh or stale)
    /// - `None` if no data exists at all
    ///
    /// Behavior:
    /// - If fresh cache has data, return it immediately
    /// - If only stale cache has data, return it immediately AND trigger background refresh
    /// - If no cache has data, return None
    pub async fn get_with_swr<F, Fut>(&self, key: K, fetch_fn: F) -> Option<V>
    where
        F: FnOnce(K) -> Fut + Send + 'static,
        Fut: Future<Output = Option<V>> + Send,
    {
        // Check fresh cache first
        if let Some(value) = self.fresh_cache.get(&key).await {
            return Some(value);
        }

        // Check stale cache
        if let Some(stale_value) = self.stale_cache.get(&key).await {
            // Spawn background refresh
            let fresh_cache = self.fresh_cache.clone();
            let stale_cache = self.stale_cache.clone();
            let key_clone = key.clone();

            tokio::spawn(async move {
                if let Some(fresh_value) = fetch_fn(key_clone.clone()).await {
                    fresh_cache
                        .insert(key_clone.clone(), fresh_value.clone())
                        .await;
                    stale_cache.insert(key_clone, fresh_value).await;
                }
            });

            return Some(stale_value);
        }

        None
    }

    /// Get a value from the cache, blocking until fresh data is available.
    ///
    /// This is similar to moka's get_with but updates both caches.
    pub async fn get_with<F, Fut>(&self, key: K, fetch_fn: F) -> Option<V>
    where
        F: FnOnce(K) -> Fut + Send,
        Fut: Future<Output = Option<V>> + Send,
    {
        // Check fresh cache first
        if let Some(value) = self.fresh_cache.get(&key).await {
            return Some(value);
        }

        // Fetch new value
        let value = fetch_fn(key.clone()).await?;

        // Update both caches
        self.insert(key, value.clone()).await;

        Some(value)
    }

    /// Clear all entries from both caches.
    #[cfg(test)]
    pub async fn invalidate_all(&self) {
        self.fresh_cache.invalidate_all();
        self.stale_cache.invalidate_all();
        // Wait for invalidation to complete
        self.fresh_cache.run_pending_tasks().await;
        self.stale_cache.run_pending_tasks().await;
    }

    #[cfg(test)]
    pub fn fresh_ttl(&self) -> Duration {
        self.fresh_ttl
    }

    #[cfg(test)]
    pub fn stale_ttl(&self) -> Duration {
        self.stale_ttl
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicU32, Ordering};

    #[tokio::test]
    async fn test_basic_insert_and_get() {
        let cache = SwrCache::new(Duration::from_secs(10), Duration::from_secs(60));

        cache.insert("key1".to_string(), "value1".to_string()).await;

        let fetch_count = Arc::new(AtomicU32::new(0));
        let fetch_count_clone = fetch_count.clone();

        let result = cache
            .get_with_swr("key1".to_string(), |_| async move {
                fetch_count_clone.fetch_add(1, Ordering::SeqCst);
                Some("fresh_value".to_string())
            })
            .await;

        assert_eq!(result, Some("value1".to_string()));
        assert_eq!(fetch_count.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn test_swr_returns_stale_and_refreshes() {
        let cache = SwrCache::new(Duration::from_millis(50), Duration::from_secs(60));

        cache
            .insert("key1".to_string(), "stale_value".to_string())
            .await;

        tokio::time::sleep(Duration::from_millis(100)).await;

        let fetch_count = Arc::new(AtomicU32::new(0));
        let fetch_count_clone = fetch_count.clone();

        let result = cache
            .get_with_swr("key1".to_string(), move |_| {
                let fc = fetch_count_clone.clone();
                async move {
                    fc.fetch_add(1, Ordering::SeqCst);
                    tokio::time::sleep(Duration::from_millis(50)).await;
                    Some("fresh_value".to_string())
                }
            })
            .await;

        assert_eq!(result, Some("stale_value".to_string()));

        tokio::time::sleep(Duration::from_millis(100)).await;

        assert_eq!(fetch_count.load(Ordering::SeqCst), 1);

        let result2 = cache
            .get_with_swr("key1".to_string(), |_| async move {
                Some("should_not_fetch".to_string())
            })
            .await;

        assert_eq!(result2, Some("fresh_value".to_string()));
    }

    #[tokio::test]
    async fn test_cache_miss_returns_none() {
        let cache: SwrCache<String, String> =
            SwrCache::new(Duration::from_secs(10), Duration::from_secs(60));

        let result = cache
            .get_with_swr("nonexistent".to_string(), |_| async move { None })
            .await;

        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn test_get_with_blocking() {
        let cache: SwrCache<String, String> =
            SwrCache::new(Duration::from_secs(10), Duration::from_secs(60));

        let fetch_count = Arc::new(AtomicU32::new(0));
        let fetch_count_clone = fetch_count.clone();

        let result = cache
            .get_with("key1".to_string(), |_| async move {
                fetch_count_clone.fetch_add(1, Ordering::SeqCst);
                tokio::time::sleep(Duration::from_millis(50)).await;
                Some("fresh_value".to_string())
            })
            .await;

        assert_eq!(result, Some("fresh_value".to_string()));
        assert_eq!(fetch_count.load(Ordering::SeqCst), 1);

        let result2 = cache
            .get_with("key1".to_string(), |_| async move {
                Some("should_not_fetch".to_string())
            })
            .await;

        assert_eq!(result2, Some("fresh_value".to_string()));
        assert_eq!(fetch_count.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn test_stale_cache_expires() {
        let cache = SwrCache::new(Duration::from_millis(50), Duration::from_millis(100));

        cache.insert("key1".to_string(), "value1".to_string()).await;

        tokio::time::sleep(Duration::from_millis(150)).await;

        cache.fresh_cache.run_pending_tasks().await;
        cache.stale_cache.run_pending_tasks().await;

        let result = cache
            .get_with_swr("key1".to_string(), |_| async move { None })
            .await;

        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn test_concurrent_requests() {
        let cache = Arc::new(SwrCache::new(
            Duration::from_millis(50),
            Duration::from_secs(60),
        ));

        cache
            .insert("key1".to_string(), "initial".to_string())
            .await;

        tokio::time::sleep(Duration::from_millis(100)).await;

        let fetch_count = Arc::new(AtomicU32::new(0));

        let mut handles = vec![];
        for _ in 0..10 {
            let cache_clone = cache.clone();
            let fetch_count_clone = fetch_count.clone();
            let handle = tokio::spawn(async move {
                cache_clone
                    .get_with_swr("key1".to_string(), move |_| {
                        let fc = fetch_count_clone.clone();
                        async move {
                            fc.fetch_add(1, Ordering::SeqCst);
                            tokio::time::sleep(Duration::from_millis(50)).await;
                            Some("fresh".to_string())
                        }
                    })
                    .await
            });
            handles.push(handle);
        }

        let results: Vec<_> = futures_util::future::join_all(handles).await;

        for result in results {
            assert_eq!(result.unwrap(), Some("initial".to_string()));
        }

        tokio::time::sleep(Duration::from_millis(100)).await;

        assert!(fetch_count.load(Ordering::SeqCst) >= 1);
    }
}
