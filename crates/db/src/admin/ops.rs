use super::{format_iso8601, User};

pub struct AdminDatabase {
    conn: libsql::Connection,
}

impl AdminDatabase {
    pub async fn from(conn: libsql::Connection) -> Self {
        Self { conn }
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

    pub async fn create_user(&self, user: User) -> anyhow::Result<()> {
        let _ = self
            .conn
            .execute(
                "INSERT INTO users (
                    created_at,
                    updated_at,
                    clerk_user_id,
                    turso_db_name
                ) VALUES (?, ?, ?, ?)",
                vec![
                    format_iso8601(user.created_at),
                    format_iso8601(user.updated_at),
                    user.clerk_user_id,
                    user.turso_db_name,
                ],
            )
            .await?;
        Ok(())
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

        db.create_user(User {
            created_at: time::OffsetDateTime::now_utc(),
            updated_at: time::OffsetDateTime::now_utc(),
            clerk_user_id: "21".to_string(),
            turso_db_name: "12".to_string(),
        })
        .await
        .unwrap();

        let users = db.list_users().await.unwrap();
        assert_eq!(users.len(), 1);
        assert_eq!(users[0].turso_db_name, "12".to_string());

        let user = db
            .get_user_by_clerk_user_id("21".to_string())
            .await
            .unwrap();
        assert_eq!(user.turso_db_name, "12".to_string());
    }
}
