use hypr_db_core::SqlTable;

use super::{Folder, UserDatabase};

impl UserDatabase {
    pub async fn list_folders(
        &self,
        user_id: impl Into<String>,
    ) -> Result<Vec<Folder>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "SELECT * FROM folders WHERE user_id = ?",
                vec![user_id.into()],
            )
            .await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: Folder = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn upsert_folder(&self, folder: Folder) -> Result<Folder, crate::Error> {
        let conn = self.conn()?;

        let sql = format!(
            "INSERT OR REPLACE INTO {} (
                id,
                name,
                user_id,
                parent_id
            ) VALUES (?, ?, ?, ?) RETURNING *",
            Folder::sql_table()
        );

        let params = vec![
            libsql::Value::Text(folder.id),
            libsql::Value::Text(folder.name),
            libsql::Value::Text(folder.user_id),
            folder
                .parent_id
                .map(libsql::Value::Text)
                .unwrap_or(libsql::Value::Null),
        ];

        let mut rows = conn.query(&sql, params).await?;

        let row = rows.next().await?.unwrap();
        let folder: Folder = libsql::de::from_row(&row)?;
        Ok(folder)
    }
}

#[cfg(test)]
mod tests {
    use crate::{tests::setup_db, Folder, Human};

    #[tokio::test]
    async fn test_folders() {
        let db = setup_db().await;

        let human = db
            .upsert_human(Human {
                full_name: Some("yujonglee".to_string()),
                ..Human::default()
            })
            .await
            .unwrap();

        let user_id = human.id.clone();

        let folders = db.list_folders(user_id.clone()).await.unwrap();
        assert_eq!(folders.len(), 0);

        let folder = Folder {
            id: uuid::Uuid::new_v4().to_string(),
            name: "test".to_string(),
            user_id: human.id.clone(),
            parent_id: None,
        };

        let folder = db.upsert_folder(folder).await.unwrap();
        assert_eq!(folder.name, "test");

        let folders = db.list_folders(user_id.clone()).await.unwrap();
        assert_eq!(folders.len(), 1);
    }
}
