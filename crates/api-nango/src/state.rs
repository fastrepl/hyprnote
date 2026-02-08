use hypr_nango::NangoClient;

use crate::config::NangoConfig;
use crate::error::NangoError;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) config: NangoConfig,
    pub(crate) nango: NangoClient,
}

impl AppState {
    pub(crate) fn new(config: NangoConfig) -> Result<Self, NangoError> {
        let nango = hypr_nango::NangoClientBuilder::default()
            .api_base(&config.nango.nango_api_base)
            .api_key(&config.nango.nango_api_key)
            .build()
            .map_err(|e| NangoError::Nango(e.to_string()))?;

        Ok(Self { config, nango })
    }
}
