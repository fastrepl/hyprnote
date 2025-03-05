mod accounts_ops;
mod accounts_types;
mod billings_ops;
mod billings_types;
mod devices_ops;
mod devices_types;
mod integrations_ops;
mod integrations_types;
mod users_ops;
mod users_types;

#[allow(unused)]
pub use accounts_ops::*;
#[allow(unused)]
pub use accounts_types::*;
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
pub use users_ops::*;
#[allow(unused)]
pub use users_types::*;

#[cfg(debug_assertions)]
mod seed;
#[cfg(debug_assertions)]
pub use seed::*;

pub use hypr_db_core::Error;

#[macro_export]
macro_rules! admin_common_derives {
    ($item:item) => {
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, schemars::JsonSchema)]
        $item
    };
}

#[derive(Clone)]
pub struct AdminDatabase {
    db: hypr_db_core::Database,
}

impl AdminDatabase {
    pub fn from(db: hypr_db_core::Database) -> Self {
        Self { db }
    }
}

impl std::ops::Deref for AdminDatabase {
    type Target = hypr_db_core::Database;

    fn deref(&self) -> &Self::Target {
        &self.db
    }
}

// Append only. Do not reorder.
const MIGRATIONS: [&str; 5] = [
    include_str!("./billings_migration.sql"),
    include_str!("./devices_migration.sql"),
    include_str!("./integrations_migration.sql"),
    include_str!("./accounts_migration.sql"),
    include_str!("./users_migration.sql"),
];

pub async fn migrate(db: &AdminDatabase) -> Result<(), crate::Error> {
    let conn = db.conn()?;
    hypr_db_core::migrate(&conn, MIGRATIONS.to_vec()).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::AdminDatabase;
    use crate::{migrate, seed};
    use hypr_db_core::DatabaseBuilder;

    pub async fn setup_db() -> AdminDatabase {
        let base_db = DatabaseBuilder::default().memory().build().await.unwrap();
        let admin_db = AdminDatabase::from(base_db);
        migrate(&admin_db).await.unwrap();
        admin_db
    }

    #[tokio::test]
    async fn test_seed() {
        let db = setup_db().await;
        seed(&db).await.unwrap();
    }
}
