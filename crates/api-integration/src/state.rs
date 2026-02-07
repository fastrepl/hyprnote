use hypr_nango::NangoClient;

use crate::config::IntegrationConfig;
use crate::error::IntegrationError;

#[derive(Clone)]
pub struct AppState {
    pub config: IntegrationConfig,
    pub nango: NangoClient,
}

impl AppState {
    pub fn new(config: IntegrationConfig) -> Result<Self, IntegrationError> {
        let nango = hypr_nango::NangoClientBuilder::default()
            .api_base(&config.nango_api_base)
            .api_key(&config.nango_api_key)
            .build()
            .map_err(|e| IntegrationError::Nango(e.to_string()))?;

        Ok(Self { config, nango })
    }
}
