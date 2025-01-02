use crate::{migrate as migrate_impl, Connection};

const MIGRATIONS: [&str; 2] = [include_str!("./0000.sql"), include_str!("./0001.sql")];

pub async fn migrate(conn: &Connection) -> anyhow::Result<()> {
    migrate_impl(conn, MIGRATIONS.to_vec()).await
}
