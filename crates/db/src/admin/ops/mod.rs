use crate::Connection;

mod billings;
mod devices;
mod integrations;
mod organizations;
mod users;

#[derive(Clone)]
pub struct AdminDatabase {
    conn: Connection,
}

impl AdminDatabase {
    pub fn from(conn: Connection) -> Self {
        Self { conn }
    }
}

#[cfg(test)]
mod tests {
    use super::AdminDatabase;
    use crate::{
        admin::{migrate, seed},
        ConnectionBuilder,
    };

    pub async fn setup_db() -> AdminDatabase {
        let conn = ConnectionBuilder::new()
            .local(":memory:")
            .connect()
            .await
            .unwrap();

        migrate(&conn).await.unwrap();
        AdminDatabase::from(conn)
    }

    #[tokio::test]
    async fn test_seed() {
        let db = setup_db().await;
        seed(&db).await.unwrap();
    }
}
