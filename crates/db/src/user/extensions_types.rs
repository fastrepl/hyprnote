use crate::user_common_derives;

user_common_derives! {
    pub struct Extension {
        pub id: String,
        pub user_id: String,
        pub config: Option<String>,
    }
}
