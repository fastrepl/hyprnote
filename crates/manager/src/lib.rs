mod job;

use apalis::prelude::*;
use apalis_sql::sqlite::SqlitePool;
use apalis_sql::sqlite::SqliteStorage;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("sqlx error")]
    SqlxError(#[from] sqlx::Error),
    #[error("io error")]
    IoError(#[from] std::io::Error),
}

pub struct Manager {}

impl Manager {
    pub fn new() -> Self {
        Self {}
    }

    pub async fn monitor(&self) -> Result<(), Error> {
        let pool = SqlitePool::connect(":memory:").await?;
        SqliteStorage::setup(&pool).await?;

        let stt_storage: SqliteStorage<job::STT> = SqliteStorage::new(pool.clone());

        Monitor::new()
            .register(
                WorkerBuilder::new("stt")
                    .backend(stt_storage)
                    .build_fn(job::run_stt),
            )
            .run()
            .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_new() {
        let _ = Manager::new();
    }
}
