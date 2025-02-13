use super::{Extension, UserDatabase};

impl UserDatabase {
    pub async fn list_extension(
        &self,
        user_id: impl Into<String>,
    ) -> Result<Vec<Extension>, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "SELECT * FROM extensions WHERE user_id = ?",
                vec![user_id.into()],
            )
            .await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await? {
            let item: Extension = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }
}
