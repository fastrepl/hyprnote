use super::UserDatabase;
use crate::user::Human;

impl UserDatabase {
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
    use super::*;
    use crate::user::{ops::tests::setup_db, Human};

    #[tokio::test]
    async fn test_list_humans() {
        let db = setup_db().await;

        let humans = db.list_humans().await.unwrap();
        assert!(humans.len() == 0);
    }
}
