use super::{Device, User};
use crate::format_iso8601;

pub struct AdminDatabase {
    conn: libsql::Connection,
}

impl AdminDatabase {
    pub async fn from(conn: libsql::Connection) -> Self {
        Self { conn }
    }

    pub async fn list_devices(&self) -> anyhow::Result<Vec<Device>> {
        let mut rows = self.conn.query("SELECT * FROM devices", ()).await.unwrap();
        let mut devices = Vec::new();

        while let Some(row) = rows.next().await.unwrap() {
            let device: Device = libsql::de::from_row(&row).unwrap();
            devices.push(device);
        }

        Ok(devices)
    }

    pub async fn list_users(&self) -> anyhow::Result<Vec<User>> {
        let mut rows = self.conn.query("SELECT * FROM users", ()).await.unwrap();
        let mut users = Vec::new();

        while let Some(row) = rows.next().await.unwrap() {
            let user: User = libsql::de::from_row(&row).unwrap();
            users.push(user);
        }

        Ok(users)
    }

    pub async fn create_user(&self, user: User) -> anyhow::Result<User> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO users (
                    created_at,
                    clerk_user_id,
                    turso_db_name
                ) VALUES (?, ?, ?) 
                RETURNING *",
                vec![
                    format_iso8601(user.created_at),
                    user.clerk_user_id,
                    user.turso_db_name,
                ],
            )
            .await?;

        let row = rows.next().await.unwrap().unwrap();
        let user: User = libsql::de::from_row(&row).unwrap();
        Ok(user)
    }

    pub async fn get_user_by_clerk_user_id(&self, clerk_user_id: String) -> anyhow::Result<User> {
        let mut rows = self
            .conn
            .query(
                "SELECT * FROM users WHERE clerk_user_id = ?",
                vec![clerk_user_id],
            )
            .await?;

        let row = rows.next().await.unwrap().unwrap();
        let user: User = libsql::de::from_row(&row).unwrap();
        Ok(user)
    }

    pub async fn create_device(&self, device: Device) -> anyhow::Result<Device> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO devices (
                    created_at,
                    user_id,
                    fingerprint,
                    api_key
                ) VALUES (?, ?, ?, ?) 
                RETURNING *",
                vec![
                    format_iso8601(device.created_at),
                    device.user_id.to_string(),
                    device.fingerprint,
                    device.api_key,
                ],
            )
            .await?;

        let row = rows.next().await.unwrap().unwrap();
        let device: Device = libsql::de::from_row(&row).unwrap();
        Ok(device)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{admin::migrations, migrate, ConnectionBuilder};

    async fn setup_db() -> AdminDatabase {
        let conn = ConnectionBuilder::new()
            .local(":memory:")
            .connect()
            .await
            .unwrap();

        migrate(&conn, migrations::v0()).await.unwrap();
        AdminDatabase::from(conn).await
    }

    #[tokio::test]
    async fn test_create_list_get_user() {
        let db = setup_db().await;

        let user = db
            .create_user(User {
                clerk_user_id: "21".to_string(),
                turso_db_name: "12".to_string(),
                ..User::default()
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
            .create_user(User {
                clerk_user_id: "21".to_string(),
                turso_db_name: "12".to_string(),
                ..User::default()
            })
            .await
            .unwrap();

        let device = db
            .create_device(Device {
                user_id: user.id,
                fingerprint: "3".to_string(),
                api_key: "4".to_string(),
                ..Device::default()
            })
            .await
            .unwrap();
        assert_eq!(device.user_id, user.id);
    }
}
