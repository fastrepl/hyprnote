use time::{serde::rfc3339, OffsetDateTime};

use crate::admin_common_derives;

admin_common_derives! {
    pub struct Device {
        pub id: String,
        pub user_id: String,
        #[serde(with = "rfc3339")]
        pub timestamp: OffsetDateTime,
        pub fingerprint: String,
        pub api_key: String,
    }
}
