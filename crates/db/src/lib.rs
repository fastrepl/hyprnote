#[cfg(feature = "admin")]
pub mod admin;

#[cfg(feature = "user")]
pub mod user;

pub type Connection = libsql::Connection;

#[derive(Debug, Default)]
struct ConnectionConfig {
    local_path: Option<std::path::PathBuf>,
    remote_config: Option<(String, String)>,
}

impl ConnectionConfig {
    pub async fn connect(&self) -> anyhow::Result<Connection> {
        let db = match (self.local_path.clone(), self.remote_config.clone()) {
            (Some(path), None) => libsql::Builder::new_local(path).build().await?,
            (None, Some((url, token))) => libsql::Builder::new_remote(url, token).build().await?,
            (Some(path), Some((url, token))) => {
                libsql::Builder::new_remote_replica(path, url, token)
                    .sync_interval(std::time::Duration::from_secs(300))
                    .build()
                    .await?
            }
            (None, None) => {
                anyhow::bail!("either '.local()' or '.remote()' must be called")
            }
        };

        let conn = db.connect()?;
        Ok(conn)
    }
}

pub struct ConnectionBuilder {
    config: ConnectionConfig,
}

impl ConnectionBuilder {
    pub fn new() -> Self {
        Self {
            config: ConnectionConfig::default(),
        }
    }

    pub fn local(mut self, path: impl AsRef<std::path::Path>) -> Self {
        self.config.local_path = Some(path.as_ref().to_owned());
        self
    }

    pub fn remote(mut self, url: impl Into<String>, token: impl Into<String>) -> Self {
        self.config.remote_config = Some((url.into(), token.into()));
        self
    }

    pub async fn connect(self) -> anyhow::Result<Connection> {
        let conn = self.config.connect().await?;
        Ok(conn)
    }
}

async fn migrate(conn: &Connection, migrations: Vec<impl AsRef<str>>) -> libsql::Result<()> {
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
