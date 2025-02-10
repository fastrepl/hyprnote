use super::UserDatabase;
use crate::user::Human;

impl UserDatabase {
    pub async fn upsert_human(&self, human: Human) -> Result<Human, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT OR REPLACE INTO humans (
                    id, 
                    organization_id,
                    is_user,
                    full_name,
                    email,
                    job_title,
                    linkedin_username
                ) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *",
                (
                    human.id,
                    human.organization_id,
                    human.is_user,
                    human.full_name,
                    human.email,
                    human.job_title,
                    human.linkedin_username,
                ),
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let human: Human = libsql::de::from_row(&row)?;
        Ok(human)
    }

    pub async fn list_humans(&self) -> Result<Vec<Human>, crate::Error> {
        let mut rows = self.conn.query("SELECT * FROM humans", ()).await?;

        let mut humans = Vec::new();
        while let Some(row) = rows.next().await? {
            let human: Human = libsql::de::from_row(&row)?;
            humans.push(human);
        }
        Ok(humans)
    }
}

#[cfg(test)]
mod tests {
    use crate::user::{ops::tests::setup_db, Human};

    #[tokio::test]
    async fn test_humans() {
        let db = setup_db().await;

        let humans = db.list_humans().await.unwrap();
        assert!(humans.len() == 0);

        let human = Human {
            full_name: Some("test".to_string()),
            ..Human::default()
        };

        let human = db.upsert_human(human).await.unwrap();
        assert_eq!(human.full_name, Some("test".to_string()));

        let humans = db.list_humans().await.unwrap();
        assert!(humans.len() == 1);
    }
}
