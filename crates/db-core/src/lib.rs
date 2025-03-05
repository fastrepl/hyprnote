use std::sync::Arc;

pub use libsql;

#[derive(Clone)]
pub enum Database {
    InMemory(libsql::Connection),
    NotInMemory(Arc<libsql::Database>),
}

impl Database {
    pub fn conn(&self) -> Result<libsql::Connection, crate::Error> {
        match self {
            Database::InMemory(conn) => Ok(conn.clone()),
            Database::NotInMemory(db) => db.connect().map_err(|e| Into::into(e)),
        }
    }

    pub async fn sync(&self) -> Result<(), crate::Error> {
        match self {
            Database::InMemory(_) => Ok(()),
            Database::NotInMemory(db) => db.sync().await.map_err(|e| Into::into(e)).map(|_| ()),
        }
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
                Database::InMemory(conn)
            }
            (_, Some(path), None) => {
                let db = libsql::Builder::new_local(path).build().await?;
                Database::NotInMemory(Arc::new(db))
            }
            (_, None, Some((url, token))) => {
                let db = libsql::Builder::new_remote(url, token).build().await?;
                Database::NotInMemory(Arc::new(db))
            }
            (_, Some(path), Some((url, token))) => {
                // https://github.com/tursodatabase/libsql/blob/d42e05a/libsql/examples/remote_sync.rs
                // https://docs.rs/libsql/latest/libsql/struct.Builder.html#note
                let db = libsql::Builder::new_remote_replica(path, url, token)
                    .read_your_writes(true)
                    .sync_interval(std::time::Duration::from_secs(300))
                    .build()
                    .await?;
                Database::NotInMemory(Arc::new(db))
            }
            (_, None, None) => Err(crate::Error::InvalidDatabaseConfig(
                "either '.memory()' or '.local()' or '.remote()' must be called".to_string(),
            ))?,
        };

        Ok(db)
    }
}

pub async fn migrate(
    conn: &libsql::Connection,
    migrations: Vec<impl AsRef<str>>,
) -> Result<(), crate::Error> {
    let current_version: i32 = conn
        .query("PRAGMA user_version", ())
        .await?
        .next()
        .await?
        .unwrap()
        .get(0)
        .unwrap();

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

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("libsql error: {0}")]
    LibsqlError(#[from] libsql::Error),
    #[error("serde::de error: {0}")]
    SerdeDeError(#[from] serde::de::value::Error),
    #[error("serde_json error: {0}")]
    SerdeJsonError(#[from] serde_json::Error),
    #[error("invalid database config: {0}")]
    InvalidDatabaseConfig(String),
}
