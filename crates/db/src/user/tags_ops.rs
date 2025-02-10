use super::{Tag, UserDatabase};

impl UserDatabase {
    pub async fn upsert_tag(&self, tag: Tag) -> Result<Tag, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT OR REPLACE INTO tags (
                    id,
                    session_id,
                    name
                ) VALUES (?, ?, ?)
                RETURNING *",
                (tag.id, tag.session_id, tag.name),
            )
            .await?;

        let row = rows.next().await.unwrap().unwrap();
        let tag: Tag = libsql::de::from_row(&row).unwrap();
        Ok(tag)
    }

    pub async fn delete_tag(&self, tag_id: impl Into<String>) -> Result<(), crate::Error> {
        self.conn
            .query("DELETE FROM tags WHERE id = ?", vec![tag_id.into()])
            .await?;
        Ok(())
    }

    pub async fn list_tags(&self) -> Result<Vec<Tag>, crate::Error> {
        let mut rows = self.conn.query("SELECT * FROM tags", ()).await?;

        let mut tags = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let tag: Tag = libsql::de::from_row(&row).unwrap();
            tags.push(tag);
        }
        Ok(tags)
    }
}

#[cfg(test)]
mod tests {
    use crate::user::{tests::setup_db, Tag};

    #[tokio::test]
    async fn test_tags() {
        let db = setup_db().await;
        let tags = db.list_tags().await.unwrap();
        assert_eq!(tags.len(), 0);
    }
}
