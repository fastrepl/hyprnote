use super::User;

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
                (
                    user.created_at.format(&time::format_description::well_known::iso8601::Iso8601::DEFAULT).unwrap(),
                    user.updated_at.format(&time::format_description::well_known::iso8601::Iso8601::DEFAULT).unwrap(),
                    user.clerk_user_id,
                    user.turso_db_name,
                ),
            )
            .await?;
        Ok(())
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
    async fn test_create_and_list_users() {
        let db = setup_db().await;

        db.create_user(User {
            created_at: time::OffsetDateTime::now_utc(),
            updated_at: time::OffsetDateTime::now_utc(),
            clerk_user_id: "1".to_string(),
            turso_db_name: "1".to_string(),
        })
        .await
        .unwrap();

        let users = db.list_users().await.unwrap();
        assert_eq!(users.len(), 1);
    }
}
