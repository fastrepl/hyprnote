use crate::user_common_derives;

user_common_derives! {
    pub struct Tag {
        pub id: String,
        pub user_id: String,
        pub session_id: String,
        pub name: String,
    }
}
