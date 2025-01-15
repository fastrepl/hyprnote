use serde::{Deserialize, Serialize};
use time::{serde::rfc3339, OffsetDateTime};

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub user_id: String,
    #[serde(with = "rfc3339")]
    pub timestamp: OffsetDateTime,
    pub fingerprint: String,
    pub api_key: String,
}
