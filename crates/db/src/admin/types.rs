use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: u16,
    #[serde(with = "iso8601")]
    pub created_at: OffsetDateTime,
    pub clerk_user_id: String,
    pub turso_db_name: String,
}

impl Default for User {
    fn default() -> Self {
        User {
            id: 0,
            created_at: time::OffsetDateTime::now_utc(),
            clerk_user_id: "".to_string(),
            turso_db_name: "".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Device {
    pub id: u16,
    pub user_id: u16,
    #[serde(with = "iso8601")]
    pub created_at: OffsetDateTime,
    pub fingerprint: String,
    pub api_key: String,
}

impl Default for Device {
    fn default() -> Self {
        Device {
            id: 0,
            user_id: 0,
            created_at: time::OffsetDateTime::now_utc(),
            fingerprint: "".to_string(),
            api_key: "".to_string(),
        }
    }
}
