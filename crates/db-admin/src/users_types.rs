use crate::admin_common_derives;

admin_common_derives! {
    pub struct User {
        pub id: String,
        pub account_id: String,
        pub human_id: String,
        pub timestamp: chrono::DateTime<chrono::Utc>,
        pub clerk_user_id: String,
    }
}
