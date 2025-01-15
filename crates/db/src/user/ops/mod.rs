use crate::Connection;

mod calendars;
mod config;
mod events;
mod sessions;
mod templates;

#[derive(Clone)]
pub struct UserDatabase {
    pub conn: Connection,
}

impl UserDatabase {
    pub fn from(conn: Connection) -> Self {
        Self { conn }
    }
}

#[cfg(test)]
mod tests {
    use super::UserDatabase;
    use crate::{
        user::{migrate, seed},
        ConnectionBuilder,
    };

    pub async fn setup_db() -> UserDatabase {
        let conn = ConnectionBuilder::new()
            .local(":memory:")
            .connect()
            .await
            .unwrap();

        migrate(&conn).await.unwrap();
        UserDatabase::from(conn)
    }

    #[tokio::test]
    async fn test_seed() {
        let db = setup_db().await;
        seed(&db).await.unwrap();
    }
}
