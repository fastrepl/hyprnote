use crate::user_common_derives;

user_common_derives! {
    pub struct Organization {
        pub id: String,
        pub name: String,
        pub description: Option<String>,
    }
}
