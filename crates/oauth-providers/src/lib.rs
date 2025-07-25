pub mod attio;
pub mod slack;

pub use attio::AttioProvider;
pub use slack::SlackProvider;

use hypr_oauth_core::OAuthProvider;
use std::collections::HashMap;
use std::sync::Arc;

pub struct ProviderRegistry {
    providers: HashMap<String, Arc<dyn OAuthProvider>>,
}

impl ProviderRegistry {
    pub fn new() -> Self {
        let mut providers = HashMap::new();

        providers.insert(
            "attio".to_string(),
            Arc::new(AttioProvider {}) as Arc<dyn OAuthProvider>,
        );
        providers.insert(
            "slack".to_string(),
            Arc::new(SlackProvider {}) as Arc<dyn OAuthProvider>,
        );

        Self { providers }
    }

    pub fn get(&self, name: &str) -> Option<Arc<dyn OAuthProvider>> {
        self.providers.get(name).cloned()
    }

    pub fn register(&mut self, provider: Arc<dyn OAuthProvider>) {
        self.providers.insert(provider.name().to_string(), provider);
    }
}
