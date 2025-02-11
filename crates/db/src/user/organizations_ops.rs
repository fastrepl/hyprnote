use super::{Organization, UserDatabase};

impl UserDatabase {
    pub async fn upsert_organization(
        &self,
        organization: Organization,
    ) -> Result<Organization, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO organizations (id, name, description) VALUES (?, ?, ?)",
                (organization.id, organization.name, organization.description),
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let organization: Organization = libsql::de::from_row(&row)?;
        Ok(organization)
    }

    pub async fn list_organizations(&self) -> Result<Vec<Organization>, crate::Error> {
        let mut rows = self.conn.query("SELECT * FROM organizations", ()).await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await? {
            let item: Organization = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn get_organization_by_user_id(
        &self,
        id: impl Into<String>,
    ) -> Result<Option<Organization>, crate::Error> {
        let id = id.into();
        let mut rows = self
            .conn
            .query(
                "SELECT o.* FROM organizations o 
                INNER JOIN users u ON u.organization_id = o.id 
                WHERE u.id = ?",
                vec![id],
            )
            .await?;

        match rows.next().await? {
            None => Ok(None),
            Some(row) => {
                let org: Organization = libsql::de::from_row(&row)?;
                Ok(Some(org))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::user::{tests::setup_db, Organization};

    #[tokio::test]
    async fn test_list_organizations() {
        let db = setup_db().await;

        let organizations = db.list_organizations().await.unwrap();
        assert!(organizations.len() == 0);
    }
}
