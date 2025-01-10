use serde::{Deserialize, Serialize};
use time::{serde::rfc3339, OffsetDateTime};

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    #[serde(with = "rfc3339")]
    pub timestamp: OffsetDateTime,
    pub clerk_org_id: Option<String>,
    pub clerk_user_id: String,
    pub turso_db_name: String,
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub user_id: String,
    #[serde(with = "rfc3339")]
    pub timestamp: OffsetDateTime,
    pub fingerprint: String,
    pub api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Customer {
    pub id: String,
    pub clerk_org_id: Option<String>,
    pub clerk_user_id: Option<String>,
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
pub struct Integration {
    pub id: String,
    pub user_id: String,
    pub nango_integration_id: hypr_nango::NangoIntegration,
    pub nango_connection_id: String,
}
