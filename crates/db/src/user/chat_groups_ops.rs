use super::{ChatGroup, UserDatabase};

impl UserDatabase {
    pub async fn create_chat_group(&self, group: ChatGroup) -> Result<ChatGroup, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO chat_groups (id, user_id, created_at) VALUES (?, ?, ?)",
                vec![group.id, group.user_id, group.created_at.to_rfc3339()],
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let group: ChatGroup = libsql::de::from_row(&row)?;
        Ok(group)
    }

    pub async fn list_chat_groups(
        &self,
        user_id: impl Into<String>,
    ) -> Result<Vec<ChatGroup>, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "SELECT * FROM chat_groups WHERE user_id = ?",
                vec![user_id.into()],
            )
            .await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await? {
            let item: ChatGroup = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }
}
