use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct NotificationSearch {
    pub key: String,
}

impl NotificationSearch {
    pub fn from_query_params(query_params: &HashMap<String, String>) -> crate::Result<Self> {
        let key = query_params
            .get("key")
            .ok_or(crate::Error::MissingQueryParam("key".to_string()))?;

        Ok(Self {
            key: key.to_string(),
        })
    }
}
