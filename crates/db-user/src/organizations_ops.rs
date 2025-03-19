use super::{ListOrganizationFilter, Organization, UserDatabase};

impl UserDatabase {
    pub async fn upsert_organization(
        &self,
        organization: Organization,
    ) -> Result<Organization, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "INSERT INTO organizations (id, name, description) VALUES (?, ?, ?)",
                (organization.id, organization.name, organization.description),
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let organization: Organization = libsql::de::from_row(&row)?;
        Ok(organization)
    }

    pub async fn list_organizations(
        &self,
        filter: Option<ListOrganizationFilter>,
    ) -> Result<Vec<Organization>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = match &filter {
            None => conn.query("SELECT * FROM organizations", ()).await?,
            Some(ListOrganizationFilter::Search((max, q))) => {
                conn.query(
                    "SELECT * FROM organizations WHERE name LIKE ? LIMIT ?",
                    vec![format!("%{}%", q), max.to_string()],
                )
                .await?
            }
        };

        let mut items = Vec::new();
        while let Some(row) = rows.next().await? {
            let item: Organization = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn get_organization(
        &self,
        id: impl Into<String>,
    ) -> Result<Option<Organization>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query("SELECT * FROM organizations WHERE id = ?", vec![id.into()])
            .await?;

        match rows.next().await? {
            None => Ok(None),
            Some(row) => {
                let item: Organization = libsql::de::from_row(&row)?;
                Ok(Some(item))
            }
        }
    }

    pub async fn get_organization_by_user_id(
        &self,
        id: impl Into<String>,
    ) -> Result<Option<Organization>, crate::Error> {
        let conn = self.conn()?;
        let id = id.into();

        let mut rows = conn
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
    use crate::tests::setup_db;

    #[tokio::test]
    async fn test_list_organizations() {
        let db = setup_db().await;

        let organizations = db.list_organizations(None).await.unwrap();
        assert!(organizations.len() == 0);
    }
}
