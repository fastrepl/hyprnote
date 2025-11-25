mod notification;
pub use notification::*;

use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use std::str::FromStr;

use crate::types::NotificationSearch;

#[derive(Debug, Clone, serde::Serialize, specta::Type, tauri_specta::Event)]
pub struct DeepLinkEvent(pub crate::DeepLink);

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "to", content = "search")]
pub enum DeepLink {
    #[serde(rename = "/notification")]
    Notification(NotificationSearch),
}

impl FromStr for DeepLink {
    type Err = crate::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let parsed = url::Url::parse(s)?;

        let host = parsed.host_str().unwrap_or("");
        let path = parsed.path().trim_start_matches('/');
        let full_path = if path.is_empty() {
            host.to_string()
        } else {
            format!("{}/{}", host, path)
        };

        let query_params: HashMap<String, String> = parsed.query_pairs().into_owned().collect();

        match full_path.as_str() {
            "notification" => {
                let key = query_params
                    .get("key")
                    .ok_or(crate::Error::MissingQueryParam("key".to_string()))?;

                Ok(DeepLink::Notification(NotificationSearch {
                    key: key.to_string(),
                }))
            }
            _ => Err(crate::Error::UnknownPath(full_path)),
        }
    }
}
