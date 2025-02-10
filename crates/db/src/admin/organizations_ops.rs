use super::{AdminDatabase, Organization};

impl AdminDatabase {
    pub async fn upsert_organization(
        &self,
        organization: Organization,
    ) -> Result<Option<Organization>, crate::Error> {
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

        match rows.next().await? {
            None => Ok(None),
            Some(row) => {
                let org: Organization = libsql::de::from_row(&row).unwrap();
                Ok(Some(org))
            }
        }
    }

    pub async fn get_organization_by_clerk_org_id(
        &self,
        clerk_org_id: &str,
    ) -> Result<Option<Organization>, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "SELECT * FROM organizations WHERE clerk_org_id = ?",
                vec![clerk_org_id],
            )
            .await?;

        match rows.next().await.unwrap() {
            None => Ok(None),
            Some(row) => {
                let org: Organization = libsql::de::from_row(&row).unwrap();
                Ok(Some(org))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::admin::tests::setup_db;

    #[tokio::test]
    async fn test_get_organization_by_clerk_org_id() {
        let _db = setup_db().await;
    }
}
