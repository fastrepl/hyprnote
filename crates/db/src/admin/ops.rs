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
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ConnectionBuilder;

    #[tokio::test]
    async fn test_simple() {
        let conn = ConnectionBuilder::new()
            .local(":memory:")
            .connect()
            .await
            .unwrap();

        let db = AdminDatabase::from(conn).await;
        assert_eq!(db.select_1().await, 1);
    }
}
