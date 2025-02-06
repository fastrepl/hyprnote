use super::AdminDatabase;
use crate::admin::{Customer, User};

impl AdminDatabase {
    pub async fn create_customer(&self, user: User) -> Result<Customer, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO customers (
                    id,
                    user_id
                ) VALUES (?, ?)
                RETURNING *",
                vec![
                    libsql::Value::Text(uuid::Uuid::new_v4().to_string()),
                    libsql::Value::Text(user.id),
                ],
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let customer: Customer = libsql::de::from_row(&row)?;
        Ok(customer)
    }

    pub async fn get_customer_by_user_id(
        &self,
        user_id: impl AsRef<str>,
    ) -> Result<Customer, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "SELECT * FROM customers WHERE user_id = ?",
                vec![user_id.as_ref()],
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let customer: Customer = libsql::de::from_row(&row)?;
        Ok(customer)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::admin::ops::tests::setup_db;

    #[tokio::test]
    async fn test_customers() {
        let db = setup_db().await;

        let user = db
            .upsert_user(User {
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: chrono::Utc::now(),
                clerk_org_id: None,
                clerk_user_id: "21".to_string(),
                turso_db_name: "12".to_string(),
            })
            .await
            .unwrap();

        let customer = db.create_customer(user.clone()).await.unwrap();
        assert_eq!(customer.user_id, user.id);
    }
}
