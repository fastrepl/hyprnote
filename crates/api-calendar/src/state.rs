use hypr_nango::NangoClient;

use crate::config::CalendarConfig;
use crate::error::CalendarError;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) nango: NangoClient,
}

impl AppState {
    pub(crate) fn new(config: CalendarConfig) -> Result<Self, CalendarError> {
        let nango = hypr_nango::NangoClient::builder()
            .api_base(&config.nango.nango_api_base)
            .api_key(&config.nango.nango_api_key)
            .build()
            .map_err(|e| CalendarError::Internal(e.to_string()))?;

        Ok(Self { nango })
    }
}
