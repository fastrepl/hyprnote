use super::UserDatabase;
use crate::user::Organization;

impl UserDatabase {
    pub async fn list_organizations(&self) -> Result<Vec<Organization>, crate::Error> {
        let mut rows = self.conn.query("SELECT * FROM organizations", ()).await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await? {
            let item: Organization = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::user::{ops::tests::setup_db, Organization};

    #[tokio::test]
    async fn test_list_organizations() {
        let db = setup_db().await;

        let organizations = db.list_organizations().await.unwrap();
        assert!(organizations.len() == 0);
    }
}
