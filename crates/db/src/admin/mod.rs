mod billings_ops;
mod billings_types;
mod devices_ops;
mod devices_types;
mod integrations_ops;
mod integrations_types;
mod organizations_ops;
mod organizations_types;
mod users_ops;
mod users_types;

#[allow(unused)]
pub use billings_ops::*;
#[allow(unused)]
pub use billings_types::*;
#[allow(unused)]
pub use devices_ops::*;
#[allow(unused)]
pub use devices_types::*;
#[allow(unused)]
pub use integrations_ops::*;
#[allow(unused)]
pub use integrations_types::*;
#[allow(unused)]
pub use organizations_ops::*;
#[allow(unused)]
pub use organizations_types::*;
#[allow(unused)]
pub use users_ops::*;
#[allow(unused)]
pub use users_types::*;

#[cfg(debug_assertions)]
mod seed;
#[cfg(debug_assertions)]
pub use seed::*;

#[macro_export]
macro_rules! admin_common_derives {
    ($item:item) => {
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, schemars::JsonSchema)]
        $item
    };
}

#[derive(Clone)]
pub struct AdminDatabase {
    conn: libsql::Connection,
}

impl AdminDatabase {
    pub fn from(conn: libsql::Connection) -> Self {
        Self { conn }
    }
}

// Append only. Do not reorder.
const MIGRATIONS: [&str; 5] = [
    include_str!("./billings_migration.sql"),
    include_str!("./devices_migration.sql"),
    include_str!("./integrations_migration.sql"),
    include_str!("./organizations_migration.sql"),
    include_str!("./users_migration.sql"),
];

pub async fn migrate(conn: &libsql::Connection) -> libsql::Result<()> {
    crate::migrate(conn, MIGRATIONS.to_vec()).await
}

#[cfg(test)]
mod tests {
    use super::AdminDatabase;
    use crate::{
        admin::{migrate, seed},
        DatabaseBaseBuilder,
    };

    pub async fn setup_db() -> AdminDatabase {
        let conn = DatabaseBaseBuilder::default()
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
