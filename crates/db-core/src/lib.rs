pub use libsql::{Connection, Database};

#[derive(Debug, Default)]
struct DatabaseBaseConfig {
    local_path: Option<std::path::PathBuf>,
    remote_config: Option<(String, String)>,
}

#[derive(Default)]
pub struct DatabaseBaseBuilder {
    config: DatabaseBaseConfig,
}

impl DatabaseBaseBuilder {
    pub fn local(mut self, path: impl AsRef<std::path::Path>) -> Self {
        self.config.local_path = Some(path.as_ref().to_owned());
        self
    }

    pub fn remote(mut self, url: impl Into<String>, token: impl Into<String>) -> Self {
        self.config.remote_config = Some((url.into(), token.into()));
        self
    }

    pub async fn build(self) -> Result<libsql::Database, crate::Error> {
        let db = match (self.config.local_path, self.config.remote_config) {
            (Some(path), None) => libsql::Builder::new_local(path).build().await?,
            (None, Some((url, token))) => libsql::Builder::new_remote(url, token).build().await?,
            (Some(path), Some((url, token))) => {
                // https://github.com/tursodatabase/libsql/blob/d42e05a/libsql/examples/remote_sync.rs
                // https://docs.rs/libsql/latest/libsql/struct.Builder.html#note
                libsql::Builder::new_remote_replica(path, url, token)
                    .read_your_writes(true)
                    .sync_interval(std::time::Duration::from_secs(300))
                    .build()
                    .await?
            }
            (None, None) => Err(crate::Error::InvalidDatabaseConfig(
                "either '.local()' or '.remote()' must be called".to_string(),
            ))?,
        };

        Ok(db)
    }
}

pub async fn migrate(
    conn: &libsql::Connection,
    migrations: Vec<impl AsRef<str>>,
) -> libsql::Result<()> {
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
