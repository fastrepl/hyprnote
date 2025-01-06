use crate::{migrate as migrate_impl, Connection};

const MIGRATIONS: [&str; 5] = [
    include_str!("./0000.sql"),
    include_str!("./0001.sql"),
    include_str!("./0002.sql"),
    include_str!("./0003.sql"),
    include_str!("./0004.sql"),
];

pub async fn migrate(conn: &Connection) -> anyhow::Result<()> {
    migrate_impl(conn, MIGRATIONS.to_vec()).await
}
