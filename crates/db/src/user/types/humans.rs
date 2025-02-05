use crate::user_common_derives;

user_common_derives! {
    pub struct Human {
        pub id: String,
        pub organization_id: Option<String>,
        pub is_user: bool,
        pub name: String,
        pub email: String,
        pub role: Option<String>,
    }
}
