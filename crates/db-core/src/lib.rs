use std::sync::Arc;

mod errors;
pub use errors::*;

pub use libsql;

pub const MIGRATION_TABLE_SQL: &str = include_str!("./migration.sql");

#[derive(Clone)]
pub enum Database {
    StaticConnection(libsql::Connection),
    DynamicConnection(Arc<libsql::Database>),
}

impl Database {
    pub fn conn(&self) -> Result<libsql::Connection, crate::Error> {
        match self {
            Database::StaticConnection(conn) => Ok(conn.clone()),
            Database::DynamicConnection(db) => db.connect().map_err(Into::into),
        }
    }

    pub async fn sync(&self) -> Result<(), crate::Error> {
        Ok(())
    }
}

#[derive(Debug, Default)]
struct DatabaseConfig {
    memory: Option<bool>,
    local_path: Option<std::path::PathBuf>,
    remote_config: Option<(String, String)>,
}

#[derive(Default)]
pub struct DatabaseBuilder {
    config: DatabaseConfig,
}

impl DatabaseBuilder {
    pub fn memory(mut self) -> Self {
        self.config.memory = Some(true);
        self
    }

    pub fn local(mut self, path: impl AsRef<std::path::Path>) -> Self {
        self.config.local_path = Some(path.as_ref().to_owned());
        self
    }

    pub fn remote(mut self, url: impl Into<String>, token: impl Into<String>) -> Self {
        self.config.remote_config = Some((url.into(), token.into()));
        self
    }

    pub async fn build(self) -> Result<Database, crate::Error> {
        let db = match (
            self.config.memory,
            self.config.local_path,
            self.config.remote_config,
        ) {
            (Some(true), _, _) => {
                let db = libsql::Builder::new_local(":memory:").build().await?;
                let conn = db.connect()?;
                Database::StaticConnection(conn)
            }
            (_, Some(path), None) => {
                let db = libsql::Builder::new_local(path).build().await?;
                let conn = db.connect()?;
                Database::StaticConnection(conn)
            }
            (_, None, Some((url, token))) => {
                let db = libsql::Builder::new_remote(url, token).build().await?;
                Database::DynamicConnection(Arc::new(db))
            }
            (_, Some(path), Some((url, token))) => {
                let db = libsql::Builder::new_remote_replica(path, url, token)
                    .read_your_writes(true)
                    .sync_interval(std::time::Duration::from_secs(300))
                    .build()
                    .await?;
                Database::DynamicConnection(Arc::new(db))
            }
            (_, None, None) => Err(crate::Error::InvalidDatabaseConfig(
                "either '.memory()' or '.local()' or '.remote()' must be called".to_string(),
            ))?,
        };

        Ok(db)
    }
}

pub enum TrackingSource {
    Pragma,
    Table,
}

impl TrackingSource {
    pub async fn get(&self, conn: &libsql::Connection) -> Result<Option<i32>, crate::Error> {
        match self {
            TrackingSource::Pragma => {
                let result = match conn.query("PRAGMA user_version", ()).await {
                    Ok(v) => Ok::<Option<libsql::Rows>, crate::Error>(Some(v)),
                    Err(libsql::Error::Hrana(_)) => Ok(None),
                    Err(e) => Err(e.into()),
                }?;

                match result {
                    Some(mut v) => {
                        let row = v.next().await?.unwrap();
                        Ok(Some(row.get(0).unwrap()))
                    }
                    // 'PRAGMA user_version' is not supported
                    None => Ok(None),
                }
            }
            TrackingSource::Table => Ok(None),
        }
    }
}

pub async fn migrate(
    conn: &libsql::Connection,
    migrations: Vec<impl AsRef<str>>,
) -> Result<(), crate::Error> {
    let current_version: i32 = TrackingSource::Pragma.get(conn).await?.unwrap_or(0);

    let latest_version = migrations.len() as i32;

    if current_version < latest_version {
        let tx = conn.transaction().await?;

        for migration in migrations.iter().skip(current_version as usize) {
            tx.execute(migration.as_ref(), ()).await?;
        }

        tx.execute(&format!("PRAGMA user_version = {}", latest_version), ())
            .await?;

        tx.commit().await?;
    }

    Ok(())
}

pub trait SqlTable {
    fn sql_table() -> &'static str;
}
