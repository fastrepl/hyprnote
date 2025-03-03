use crate::admin_common_derives;

admin_common_derives! {
    pub struct Device {
        pub id: String,
        pub user_id: String,
        pub timestamp: chrono::DateTime<chrono::Utc>,
        pub fingerprint: String,
        pub api_key: String,
    }
}
