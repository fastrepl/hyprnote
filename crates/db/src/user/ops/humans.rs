use super::UserDatabase;
use crate::user::Human;

impl UserDatabase {
    pub async fn create_human(&self, human: Human) -> Result<Human, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO humans (
                    id, 
                    organization_id,
                    is_user,
                    name,
                    email,
                    job_title,
                    linkedin_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *",
                (
                    human.id,
                    human.organization_id,
                    human.is_user,
                    human.name,
                    human.email,
                    human.job_title,
                    human.linkedin_url,
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
            name: Some("test".to_string()),
            ..Human::default()
        };

        let human = db.create_human(human).await.unwrap();
        assert_eq!(human.name, Some("test".to_string()));

        let humans = db.list_humans().await.unwrap();
        assert!(humans.len() == 1);
    }
}
