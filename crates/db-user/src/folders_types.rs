use crate::user_common_derives;

user_common_derives! {
    #[sql_table("folders")]
    pub struct Folder {
        pub id: String,
        pub name: String,
        pub user_id: String,
        pub parent_id: Option<String>,
    }
}
