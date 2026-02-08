use hypr_nango::NangoClient;

use crate::config::NangoConfig;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) config: NangoConfig,
    pub(crate) nango: NangoClient,
}

impl AppState {
    pub(crate) fn new(config: NangoConfig) -> Self {
        let nango = hypr_nango::NangoClient::builder()
            .api_base(&config.nango.nango_api_base)
            .api_key(&config.nango.nango_api_key)
            .build()
            .expect("failed to build NangoClient");

        Self { config, nango }
    }
}
