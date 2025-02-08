use super::AdminDatabase;
use crate::admin::Billing;

impl AdminDatabase {
    pub async fn create_default_billing(
        &self,
        organization_id: impl Into<String>,
    ) -> Result<Option<Billing>, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO billings (
                    id,
                    organization_id,
                    stripe_subscription,
                    stripe_customer
                ) VALUES (?, ?, ?, ?)
                RETURNING *",
                vec![
                    libsql::Value::Text(uuid::Uuid::new_v4().to_string()),
                    libsql::Value::Text(organization_id.into()),
                    libsql::Value::Null,
                    libsql::Value::Null,
                ],
            )
            .await?;

        match rows.next().await? {
            None => Ok(None),
            Some(row) => {
                let billing: Billing = libsql::de::from_row(&row).unwrap();
                Ok(Some(billing))
            }
        }
    }

    pub async fn update_stripe_customer(
        &self,
        customer: &stripe::Customer,
    ) -> Result<Option<Billing>, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "UPDATE billings 
                    SET stripe_customer = ?
                    WHERE json_extract(stripe_customer, '$.id') = ?
                RETURNING *",
                vec![
                    libsql::Value::Text(serde_json::to_string(customer)?),
                    libsql::Value::Text(customer.id.to_string()),
                ],
            )
            .await?;

        match rows.next().await? {
            None => Ok(None),
            Some(row) => {
                let billing: Billing = libsql::de::from_row(&row).unwrap();
                Ok(Some(billing))
            }
        }
    }

    pub async fn update_stripe_subscription(
        &self,
        customer_id: impl Into<String>,
        subscription: &stripe::Subscription,
    ) -> Result<Option<Billing>, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "UPDATE billings 
                    SET stripe_subscription = ?
                    WHERE json_extract(stripe_customer, '$.id') = ?
                RETURNING *",
                vec![
                    libsql::Value::Text(serde_json::to_string(subscription)?),
                    libsql::Value::Text(customer_id.into()),
                ],
            )
            .await?;

        match rows.next().await? {
            None => Ok(None),
            Some(row) => {
                let billing: Billing = libsql::de::from_row(&row).unwrap();
                Ok(Some(billing))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::AdminDatabase;
    use crate::admin::{ops::tests::setup_db, User};

    #[tokio::test]
    async fn test_update_stripe_customer() {
        let db = setup_db().await;

        let user = db
            .update_stripe_customer(&stripe::Customer::default())
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_update_stripe_subscription() {
        let db = setup_db().await;

        let subscription = db
            .update_stripe_subscription("TODO", &stripe::Subscription::default())
            .await
            .unwrap();
    }
}
