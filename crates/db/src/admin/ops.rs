pub struct AdminDatabase {
    conn: libsql::Connection,
}

impl AdminDatabase {
    pub async fn from(conn: libsql::Connection) -> Self {
        Self { conn }
    }

    pub async fn select_1(&self) -> i64 {
        let mut rows = self.conn.query("SELECT 1", ()).await.unwrap();
        let row = rows.next().await.unwrap().unwrap();
        let value: i64 = row.get(0).unwrap();
        value
    }

    pub async fn list_users(&self) -> i32 {
        let mut rows = self.conn.query("SELECT * FROM users", ()).await.unwrap();

        let mut count = 0;
        while let Some(_row) = rows.next().await.unwrap() {
            count += 1;
        }
        count
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{admin::migrations, migrate, ConnectionBuilder};

    async fn setup_db(conn: &libsql::Connection) {
        migrate(conn, migrations::v0()).await.unwrap();
    }

    #[tokio::test]
    async fn test_simple() {
        let conn = ConnectionBuilder::new()
            .local(":memory:")
            .connect()
            .await
            .unwrap();

        setup_db(&conn).await;

        let db = AdminDatabase::from(conn).await;
        assert_eq!(db.select_1().await, 1);
        assert_eq!(db.list_users().await, 0);
    }
}
