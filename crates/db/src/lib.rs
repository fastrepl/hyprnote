#[cfg(feature = "admin")]
pub mod admin;

#[cfg(feature = "user")]
pub mod user;

#[derive(Debug, Default)]
struct DatabaseBaseConfig {
    local_path: Option<std::path::PathBuf>,
    remote_config: Option<(String, String)>,
}

impl DatabaseBaseConfig {
    pub async fn connect(&self) -> Result<libsql::Connection, crate::Error> {
        let db = match (self.local_path.clone(), self.remote_config.clone()) {
            (Some(path), None) => libsql::Builder::new_local(path).build().await?,
            (None, Some((url, token))) => libsql::Builder::new_remote(url, token).build().await?,
            (Some(path), Some((url, token))) => {
                libsql::Builder::new_remote_replica(path, url, token)
                    .sync_interval(std::time::Duration::from_secs(300))
                    .build()
                    .await?
            }
            (None, None) => Err(crate::Error::InvalidDatabaseConfig(
                "either '.local()' or '.remote()' must be called".to_string(),
            ))?,
        };

        let conn = db.connect()?;
        Ok(conn)
    }
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

    pub async fn connect(self) -> Result<libsql::Connection, crate::Error> {
        let conn = self.config.connect().await?;
        Ok(conn)
    }
}

async fn migrate(
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
