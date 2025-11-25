mod notification;
pub use notification::*;

use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use std::str::FromStr;

#[derive(Debug, Clone, serde::Serialize, specta::Type, tauri_specta::Event)]
pub struct DeepLinkEvent(pub DeepLink);

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
            "notification" => Ok(DeepLink::Notification(
                NotificationSearch::from_query_params(&query_params)?,
            )),
            _ => Err(crate::Error::UnknownPath(full_path)),
        }
    }
}
