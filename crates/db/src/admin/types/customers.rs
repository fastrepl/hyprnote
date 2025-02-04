use crate::admin_common_derives;

admin_common_derives! {
    pub struct Customer {
        pub id: String,
        pub user_id: String,
    }
}
