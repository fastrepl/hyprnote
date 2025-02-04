use time::{serde::rfc3339, OffsetDateTime};

use crate::admin_common_derives;

admin_common_derives! {
    pub struct User {
        pub id: String,
        #[serde(with = "rfc3339")]
        pub timestamp: OffsetDateTime,
        pub clerk_org_id: Option<String>,
        pub clerk_user_id: String,
        pub turso_db_name: String,
    }
}
