use crate::{migrate as migrate_impl, Connection};

const MIGRATIONS: [&str; 4] = [
    include_str!("./0000.sql"),
    include_str!("./0001.sql"),
    include_str!("./0002.sql"),
    include_str!("./0003.sql"),
];

pub async fn migrate(conn: &Connection) -> libsql::Result<()> {
    migrate_impl(conn, MIGRATIONS.to_vec()).await
}
