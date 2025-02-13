use crate::user_common_derives;

user_common_derives! {
    #[derive(strum::EnumString, strum::Display)]
    pub enum ChatMessageRole {
        User,
        Assistant,
    }
}

user_common_derives! {
    pub struct ChatMessage {
        pub id: String,
        pub group_id: String,
        pub created_at: chrono::DateTime<chrono::Utc>,
        pub role: ChatMessageRole,
        pub content: String,
    }
}
