use super::{Tag, UserDatabase};

impl UserDatabase {
    pub async fn upsert_tag(&self, tag: Tag) -> Result<Tag, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "INSERT OR REPLACE INTO tags (
                    id,
                    user_id,
                    session_id,
                    name
                ) VALUES (?, ?, ?, ?)
                RETURNING *",
                (tag.id, tag.user_id, tag.session_id, tag.name),
            )
            .await?;

        let row = rows.next().await.unwrap().unwrap();
        let tag: Tag = libsql::de::from_row(&row).unwrap();
        Ok(tag)
    }

    pub async fn delete_tag(&self, tag_id: impl Into<String>) -> Result<(), crate::Error> {
        let conn = self.conn()?;

        conn.query("DELETE FROM tags WHERE id = ?", vec![tag_id.into()])
            .await?;
        Ok(())
    }

    pub async fn list_tags_by_user(
        &self,
        user_id: impl Into<String>,
    ) -> Result<Vec<Tag>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query("SELECT * FROM tags WHERE user_id = ?", vec![user_id.into()])
            .await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: Tag = libsql::de::from_row(&row).unwrap();
            items.push(item);
        }
        Ok(items)
    }
}

#[cfg(test)]
mod tests {
    use crate::{tests::setup_db, Human, Session, Tag};

    #[tokio::test]
    async fn test_tags() {
        let db = setup_db().await;

        let user = db
            .upsert_human(Human {
                full_name: Some("John Doe".to_string()),
                ..Human::default()
            })
            .await
            .unwrap();

        let session = db
            .upsert_session(Session {
                id: uuid::Uuid::new_v4().to_string(),
                user_id: user.id.clone(),
                timestamp: chrono::Utc::now(),
                calendar_event_id: None,
                title: "Test Session".to_string(),
                audio_local_path: None,
                audio_remote_path: None,
                raw_memo_html: "".to_string(),
                enhanced_memo_html: None,
                conversations: vec![],
            })
            .await
            .unwrap();

        assert_eq!(db.list_tags_by_user(&user.id).await.unwrap().len(), 0);

        let tag = db
            .upsert_tag(Tag {
                id: uuid::Uuid::new_v4().to_string(),
                user_id: user.id.clone(),
                session_id: session.id.clone(),
                name: "Test Tag".to_string(),
            })
            .await
            .unwrap();

        assert_eq!(db.list_tags_by_user(user.id).await.unwrap().len(), 1);
    }
}
