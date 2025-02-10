use super::{AdminDatabase, Organization};

impl AdminDatabase {
    pub async fn upsert_organization(
        &self,
        organization: Organization,
    ) -> Result<Organization, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO organizations (
                id,
                turso_db_name,
                clerk_org_id
            ) VALUES (?, ?, ?) RETURNING *",
                vec![
                    libsql::Value::Text(organization.id),
                    libsql::Value::Text(organization.turso_db_name),
                    organization
                        .clerk_org_id
                        .map(libsql::Value::Text)
                        .unwrap_or(libsql::Value::Null),
                ],
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let org: Organization = libsql::de::from_row(&row).unwrap();
        Ok(org)
    }

    pub async fn list_organizations_by_user_id(
        &self,
        user_id: impl Into<String>,
    ) -> Result<Vec<Organization>, crate::Error> {
        let rows = self
            .conn
            .query(
                "SELECT o.* FROM organizations o
                 INNER JOIN users u ON u.organization_id = o.id
                 WHERE u.clerk_user_id = ?",
                vec![user_id.into()],
            )
            .await?;

        let mut organizations = Vec::new();
        let mut rows = rows;
        while let Some(row) = rows.next().await? {
            let org: Organization = libsql::de::from_row(&row).unwrap();
            organizations.push(org);
        }

        Ok(organizations)
    }
}

#[cfg(test)]
mod tests {
    use crate::admin::{tests::setup_db, Organization};

    #[tokio::test]
    async fn test_organizations() {
        let db = setup_db().await;

        let org = Organization {
            id: uuid::Uuid::new_v4().to_string(),
            turso_db_name: "yujonglee".to_string(),
            clerk_org_id: Some("org_1".to_string()),
        };

        let org = db.upsert_organization(org).await.unwrap();
        assert_eq!(org.clerk_org_id, Some("org_1".to_string()));
    }
}
