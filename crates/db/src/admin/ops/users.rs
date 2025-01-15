use anyhow::Result;
use time::format_description::well_known::Rfc3339;

use super::AdminDatabase;
use crate::admin::User;

impl AdminDatabase {
    pub async fn list_users(&self) -> Result<Vec<User>> {
        let mut rows = self.conn.query("SELECT * FROM users", ()).await.unwrap();
        let mut users = Vec::new();

        while let Some(row) = rows.next().await.unwrap() {
            let user: User = libsql::de::from_row(&row).unwrap();
            users.push(user);
        }

        Ok(users)
    }

    pub async fn upsert_user(&self, user: User) -> Result<User> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO users (
                    id,
                    timestamp,
                    clerk_user_id,
                    turso_db_name
                ) VALUES (?, ?, ?, ?)
                ON CONFLICT (clerk_user_id) DO UPDATE SET
                    turso_db_name = excluded.turso_db_name
                RETURNING *",
                vec![
                    user.id,
                    user.timestamp.format(&Rfc3339).unwrap(),
                    user.clerk_user_id,
                    user.turso_db_name,
                ],
            )
            .await?;

        let row = rows.next().await.unwrap().unwrap();
        let user: User = libsql::de::from_row(&row).unwrap();
        Ok(user)
    }

    pub async fn get_user_by_clerk_user_id(&self, clerk_user_id: impl AsRef<str>) -> Result<User> {
        let mut rows = self
            .conn
            .query(
                "SELECT * FROM users WHERE clerk_user_id = ?",
                vec![clerk_user_id.as_ref()],
            )
            .await?;

        let row = rows.next().await.unwrap().unwrap();
        let user: User = libsql::de::from_row(&row).unwrap();
        Ok(user)
    }

    pub async fn get_user_by_device_api_key(&self, api_key: impl AsRef<str>) -> Result<User> {
        let mut rows = self
            .conn
            .query(
                "SELECT users.* FROM users
                JOIN devices ON devices.user_id = users.id
                WHERE devices.api_key = ?",
                vec![api_key.as_ref()],
            )
            .await?;

        let row = rows.next().await.unwrap().unwrap();
        let user: User = libsql::de::from_row(&row).unwrap();
        Ok(user)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::admin::{ops::tests::setup_db, Device};

    #[tokio::test]
    async fn test_create_list_get_user() {
        let db = setup_db().await;

        let user = db
            .upsert_user(User {
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: time::OffsetDateTime::now_utc(),
                clerk_org_id: None,
                clerk_user_id: "21".to_string(),
                turso_db_name: "12".to_string(),
            })
            .await
            .unwrap();
        assert_eq!(user.clerk_user_id, "21".to_string());

        let users = db.list_users().await.unwrap();
        assert_eq!(users.len(), 1);
        assert_eq!(users[0].turso_db_name, "12".to_string());

        let user = db
            .get_user_by_clerk_user_id("21".to_string())
            .await
            .unwrap();
        assert_eq!(user.turso_db_name, "12".to_string());
    }

    #[tokio::test]
    async fn test_create_list_get_device() {
        let db = setup_db().await;

        let user = db
            .upsert_user(User {
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: time::OffsetDateTime::now_utc(),
                clerk_org_id: None,
                clerk_user_id: "21".to_string(),
                turso_db_name: "12".to_string(),
            })
            .await
            .unwrap();

        let device = db
            .upsert_device(Device {
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: time::OffsetDateTime::now_utc(),
                user_id: user.id.clone(),
                fingerprint: "fingerprint".to_string(),
                api_key: "key".to_string(),
            })
            .await
            .unwrap();

        assert_eq!(device.user_id, user.id);
    }

    #[tokio::test]
    async fn test_get_user_by_device_api_key() {
        let db = setup_db().await;

        let user_1 = db
            .upsert_user(User {
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: time::OffsetDateTime::now_utc(),
                clerk_org_id: None,
                clerk_user_id: "21".to_string(),
                turso_db_name: "12".to_string(),
            })
            .await
            .unwrap();

        let device = db
            .upsert_device(Device {
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: time::OffsetDateTime::now_utc(),
                user_id: user_1.id.clone(),
                fingerprint: "fingerprint".to_string(),
                api_key: "key".to_string(),
            })
            .await
            .unwrap();

        let user_2 = db.get_user_by_device_api_key(device.api_key).await.unwrap();

        assert_eq!(user_1.id, user_2.id);
    }
}
