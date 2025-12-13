use std::collections::HashMap;
use std::fmt;

use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Serialize, Deserialize, Type)]
pub struct AuthCallbackSearch {
    pub access_token: String,
    pub refresh_token: String,
}

impl fmt::Debug for AuthCallbackSearch {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("AuthCallbackSearch")
            .field("access_token", &"[REDACTED]")
            .field("refresh_token", &"[REDACTED]")
            .finish()
    }
}

impl AuthCallbackSearch {
    pub fn from_query_params(query_params: &HashMap<String, String>) -> crate::Result<Self> {
        let access_token = query_params
            .get("access_token")
            .ok_or(crate::Error::MissingQueryParam("access_token".to_string()))?;

        let refresh_token = query_params
            .get("refresh_token")
            .ok_or(crate::Error::MissingQueryParam("refresh_token".to_string()))?;

        Ok(Self {
            access_token: access_token.to_string(),
            refresh_token: refresh_token.to_string(),
        })
    }
}
