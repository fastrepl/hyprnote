pub struct Manager {}

impl Manager {
    pub async fn new() -> Self {
        let pool = sqlx::sqlite::SqlitePool::connect(":memory:").await.unwrap();
        apalis_sql::sqlite::SqliteStorage::setup(&pool)
            .await
            .unwrap();

        Self {}
    }
}
