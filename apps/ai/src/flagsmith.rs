use std::sync::Arc;

use flagsmith::{Flagsmith, FlagsmithOptions};

pub struct FeatureFlags {
    client: Option<Flagsmith>,
}

impl FeatureFlags {
    pub fn new(environment_key: Option<String>) -> Self {
        let client = environment_key.map(|key| {
            let options = FlagsmithOptions {
                ..Default::default()
            };
            Flagsmith::new(key, options)
        });

        if client.is_some() {
            tracing::info!("flagsmith_initialized");
        } else {
            tracing::warn!("flagsmith_not_configured");
        }

        Self { client }
    }

    #[allow(dead_code)]
    pub fn is_feature_enabled(&self, feature_name: &str) -> bool {
        let Some(client) = &self.client else {
            return false;
        };

        match client.get_environment_flags() {
            Ok(flags) => flags.is_feature_enabled(feature_name).unwrap_or(false),
            Err(e) => {
                tracing::error!(error = ?e, feature = %feature_name, "flagsmith_get_flags_error");
                false
            }
        }
    }

    #[allow(dead_code)]
    pub fn get_feature_value(&self, feature_name: &str) -> Option<String> {
        let client = self.client.as_ref()?;

        match client.get_environment_flags() {
            Ok(flags) => flags.get_feature_value_as_string(feature_name).ok(),
            Err(e) => {
                tracing::error!(error = ?e, feature = %feature_name, "flagsmith_get_value_error");
                None
            }
        }
    }

    pub fn is_configured(&self) -> bool {
        self.client.is_some()
    }
}

pub type SharedFeatureFlags = Arc<FeatureFlags>;

pub fn create_feature_flags(environment_key: Option<String>) -> SharedFeatureFlags {
    Arc::new(FeatureFlags::new(environment_key))
}
