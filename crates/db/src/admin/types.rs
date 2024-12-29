use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    #[serde(with = "iso8601")]
    pub created_at: OffsetDateTime,
    #[serde(with = "iso8601")]
    pub updated_at: OffsetDateTime,
    pub clerk_user_id: String,
    pub turso_db_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub user_id: String,
    #[serde(with = "iso8601")]
    pub created_at: OffsetDateTime,
    #[serde(with = "iso8601")]
    pub updated_at: OffsetDateTime,
    pub fingerprint: String,
    pub api_key: String,
}

pub fn format_iso8601(datetime: OffsetDateTime) -> String {
    datetime
        .format(&time::format_description::well_known::iso8601::Iso8601::DEFAULT)
        .unwrap()
}
