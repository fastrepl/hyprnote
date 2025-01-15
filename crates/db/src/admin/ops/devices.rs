use anyhow::Result;
use rand::{distributions::Alphanumeric, Rng};
use time::format_description::well_known::Rfc3339;

use crate::admin::Device;

use super::AdminDatabase;

impl AdminDatabase {
    pub async fn list_devices(&self) -> Result<Vec<Device>> {
        let mut rows = self.conn.query("SELECT * FROM devices", ()).await.unwrap();
        let mut devices = Vec::new();

        while let Some(row) = rows.next().await.unwrap() {
            let device: Device = libsql::de::from_row(&row).unwrap();
            devices.push(device);
        }

        Ok(devices)
    }

    pub async fn upsert_device(&self, device: Device) -> Result<Device> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO devices (
                    id,
                    timestamp,
                    user_id,
                    fingerprint,
                    api_key
                ) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (user_id, fingerprint) DO UPDATE SET
                    api_key = excluded.api_key
                RETURNING *",
                vec![
                    device.id,
                    device.timestamp.format(&Rfc3339).unwrap(),
                    device.user_id,
                    device.fingerprint,
                    generate_api_key(),
                ],
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let device: Device = libsql::de::from_row(&row).unwrap();
        Ok(device)
    }

    pub async fn delete_device_with_api_key(&self, api_key: impl AsRef<str>) -> Result<()> {
        self.conn
            .query(
                "DELETE FROM devices WHERE api_key = ?",
                vec![api_key.as_ref()],
            )
            .await?;
        Ok(())
    }
}

fn generate_api_key() -> String {
    let key: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect();

    format!("hypr_{}", key)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::admin::{ops::tests::setup_db, User};

    #[tokio::test]
    async fn test_devices() {
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
}
