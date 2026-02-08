use hypr_api_auth::AuthState;
use hypr_nango::NangoClient;

use crate::config::CalendarConfig;
use crate::error::CalendarError;

#[derive(Clone)]
pub struct AppState {
    pub nango: NangoClient,
    pub auth: AuthState,
}

impl AppState {
    pub fn new(config: CalendarConfig) -> Result<Self, CalendarError> {
        let nango = hypr_nango::NangoClient::builder()
            .api_base(&config.nango.nango_api_base)
            .api_key(&config.nango.nango_api_key)
            .build()
            .map_err(|e| CalendarError::Internal(e.to_string()))?;

        let auth = AuthState::new(&config.supabase.supabase_url);

        Ok(Self { nango, auth })
    }
}
