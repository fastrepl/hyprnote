use crate::admin_common_derives;

// TODO: we might want to include human_id from user db here.
admin_common_derives! {
    pub struct User {
        pub id: String,
        pub timestamp: chrono::DateTime<chrono::Utc>,
        pub clerk_org_id: Option<String>,
        pub clerk_user_id: String,
        pub turso_db_name: String,
    }
}
