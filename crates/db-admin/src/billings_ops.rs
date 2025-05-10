use super::{AdminDatabase, Billing};

impl AdminDatabase {
    pub async fn get_billing_by_account_id(
        &self,
        account_id: impl Into<String>,
    ) -> Result<Option<Billing>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "SELECT * FROM billings WHERE account_id = ?",
                vec![account_id.into()],
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

    pub async fn create_empty_billing(
        &self,
        account_id: impl Into<String>,
    ) -> Result<Option<Billing>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "INSERT INTO billings (
                    id,
                    account_id,
                    stripe_subscription,
                    stripe_customer
                ) VALUES (?, ?, ?, ?)
                RETURNING *",
                vec![
                    libsql::Value::Text(uuid::Uuid::new_v4().to_string()),
                    libsql::Value::Text(account_id.into()),
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
        let conn = self.conn()?;

        let mut rows = conn
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
        subscription: Option<&stripe::Subscription>,
    ) -> Result<Option<Billing>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "UPDATE billings 
                    SET stripe_subscription = ?
                    WHERE json_extract(stripe_customer, '$.id') = ?
                RETURNING *",
                vec![
                    subscription
                        .map(|s| libsql::Value::Text(serde_json::to_string(s).unwrap()))
                        .unwrap_or(libsql::Value::Null),
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
    use crate::tests::setup_db;

    #[tokio::test]
    async fn test_update_stripe_customer() {
        let db = setup_db().await;

        db.update_stripe_customer(&stripe::Customer::default())
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_update_stripe_subscription() {
        let db = setup_db().await;

        db.update_stripe_subscription("TODO", Some(&stripe::Subscription::default()))
            .await
            .unwrap();
    }
}
