use super::{ChatMessage, UserDatabase};

impl UserDatabase {
    pub async fn upsert_chat_message(
        &self,
        message: ChatMessage,
    ) -> Result<ChatMessage, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO chat_messages (
                    id,
                    group_id,
                    created_at,
                    role,
                    content
                ) VALUES (?, ?, ?, ?, ?)",
                vec![
                    message.id,
                    message.group_id,
                    message.created_at.to_rfc3339(),
                    message.role.to_string(),
                    message.content,
                ],
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let message: ChatMessage = libsql::de::from_row(&row)?;
        Ok(message)
    }

    pub async fn list_chat_messages(
        &self,
        group_id: impl Into<String>,
    ) -> Result<Vec<ChatMessage>, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "SELECT * FROM chat_messages WHERE group_id = ?",
                vec![group_id.into()],
            )
            .await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await? {
            let item: ChatMessage = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }
}
