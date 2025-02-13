use super::{ChatGroup, UserDatabase};

impl UserDatabase {
    pub async fn create_chat_group(&self, group: ChatGroup) -> Result<ChatGroup, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO chat_groups (
                    id,
                    user_id,
                    name,
                    created_at
                ) VALUES (?, ?, ?, ?)
                RETURNING *",
                vec![
                    libsql::Value::Text(group.id),
                    libsql::Value::Text(group.user_id),
                    group
                        .name
                        .map(libsql::Value::Text)
                        .unwrap_or(libsql::Value::Null),
                    libsql::Value::Text(group.created_at.to_rfc3339()),
                ],
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
                "SELECT * FROM chat_groups 
                WHERE user_id = ? 
                ORDER BY created_at DESC",
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
