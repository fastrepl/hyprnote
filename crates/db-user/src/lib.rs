mod calendars_ops;
mod calendars_types;
mod chat_groups_ops;
mod chat_groups_types;
mod chat_messages_ops;
mod chat_messages_types;
mod config_ops;
mod config_types;
mod events_ops;
mod events_types;
mod extensions_ops;
mod extensions_types;
mod humans_ops;
mod humans_types;
mod organizations_ops;
mod organizations_types;
mod sessions_ops;
mod sessions_types;
mod tags_ops;
mod tags_types;
mod templates_ops;
mod templates_types;

#[allow(unused)]
pub use calendars_ops::*;
#[allow(unused)]
pub use calendars_types::*;
#[allow(unused)]
pub use chat_groups_ops::*;
#[allow(unused)]
pub use chat_groups_types::*;
#[allow(unused)]
pub use chat_messages_ops::*;
#[allow(unused)]
pub use chat_messages_types::*;
#[allow(unused)]
pub use config_ops::*;
#[allow(unused)]
pub use config_types::*;
#[allow(unused)]
pub use events_ops::*;
#[allow(unused)]
pub use events_types::*;
#[allow(unused)]
pub use extensions_ops::*;
#[allow(unused)]
pub use extensions_types::*;
#[allow(unused)]
pub use humans_ops::*;
#[allow(unused)]
pub use humans_types::*;
#[allow(unused)]
pub use organizations_ops::*;
#[allow(unused)]
pub use organizations_types::*;
#[allow(unused)]
pub use sessions_ops::*;
#[allow(unused)]
pub use sessions_types::*;
#[allow(unused)]
pub use tags_ops::*;
#[allow(unused)]
pub use tags_types::*;
#[allow(unused)]
pub use templates_ops::*;
#[allow(unused)]
pub use templates_types::*;

#[cfg(debug_assertions)]
mod seed;
#[cfg(debug_assertions)]
pub use seed::*;

pub use hypr_db_core::Error;

#[macro_export]
macro_rules! user_common_derives {
    ($item:item) => {
        #[derive(
            Debug,
            PartialEq,
            Clone,
            serde::Serialize,
            serde::Deserialize,
            specta::Type,
            schemars::JsonSchema,
        )]
        $item
    };
}

#[derive(Clone)]
pub struct UserDatabase {
    pub conn: libsql::Connection,
}

impl UserDatabase {
    pub fn from(conn: libsql::Connection) -> Self {
        Self { conn }
    }
}

// Append only. Do not reorder.
const MIGRATIONS: [&str; 12] = [
    include_str!("./calendars_migration.sql"),
    include_str!("./configs_migration.sql"),
    include_str!("./event_participants_migration.sql"),
    include_str!("./events_migration.sql"),
    include_str!("./humans_migration.sql"),
    include_str!("./organizations_migration.sql"),
    include_str!("./sessions_migration.sql"),
    include_str!("./templates_migration.sql"),
    include_str!("./tags_migration.sql"),
    include_str!("./chat_groups_migration.sql"),
    include_str!("./chat_messages_migration.sql"),
    include_str!("./extension_mappings_migration.sql"),
];

pub async fn migrate(conn: &libsql::Connection) -> libsql::Result<()> {
    hypr_db_core::migrate(conn, MIGRATIONS.to_vec()).await
}

#[cfg(test)]
mod tests {
    use super::UserDatabase;
    use crate::{
        user::{migrate, seed},
        DatabaseBaseBuilder,
    };

    pub async fn setup_db() -> UserDatabase {
        let conn = DatabaseBaseBuilder::default()
            .local(":memory:")
            .build()
            .await
            .unwrap()
            .connect()
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
