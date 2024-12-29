pub struct UserDatabase {
    pub conn: libsql::Connection,
}

impl UserDatabase {
    pub async fn from(conn: libsql::Connection) -> Self {
        Self { conn }
    }

    pub async fn select_1(&self) -> i64 {
        let mut rows = self.conn.query("SELECT 1", ()).await.unwrap();
        let row = rows.next().await.unwrap().unwrap();
        let value: i64 = row.get(0).unwrap();
        value
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{migrate, user::migrations, ConnectionBuilder};

    async fn setup_db() -> UserDatabase {
        let conn = ConnectionBuilder::new()
            .local(":memory:")
            .connect()
            .await
            .unwrap();

        migrate(&conn, migrations::v0()).await.unwrap();
        UserDatabase::from(conn).await
    }

    #[tokio::test]
    async fn test_simple() {
        let db = setup_db().await;
        assert_eq!(db.select_1().await, 1);
    }
}
