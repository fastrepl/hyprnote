use serde::{Deserialize, Serialize};
use time::{serde::rfc3339, OffsetDateTime};

use hypr_db_utils::deserialize::optional_json_string;

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    #[serde(with = "rfc3339")]
    pub timestamp: OffsetDateTime,
    pub clerk_user_id: String,
    pub turso_db_name: String,
}

impl Default for User {
    fn default() -> Self {
        User {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: time::OffsetDateTime::now_utc(),
            clerk_user_id: "".to_string(),
            turso_db_name: "".to_string(),
        }
    }
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
pub struct Billing {
    // https://docs.stripe.com/api/customers/object
    #[serde(deserialize_with = "optional_json_string")]
    pub stripe_customer: Option<serde_json::Value>,
    // https://docs.stripe.com/api/subscriptions/object
    #[serde(deserialize_with = "optional_json_string")]
    pub stripe_subscription: Option<serde_json::Value>,
}
