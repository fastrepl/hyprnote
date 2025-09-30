use std::future::Future;

pub trait Database2PluginExt<R: tauri::Runtime> {
    fn init_local(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn init_cloud(&self, connection_str: &str) -> impl Future<Output = Result<(), crate::Error>>;

    fn execute_local(
        &self,
        sql: String,
        args: Vec<String>,
    ) -> impl Future<Output = Result<Vec<serde_json::Value>, crate::Error>>;
    fn execute_cloud(
        &self,
        sql: String,
        args: Vec<String>,
    ) -> impl Future<Output = Result<Vec<serde_json::Value>, crate::Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> Database2PluginExt<R> for T {
    async fn init_local(&self) -> Result<(), crate::Error> {
        let db = hypr_db_core::DatabaseBuilder::default()
            .memory()
            .build()
            .await
            .unwrap();

        {
            let state = self.state::<crate::ManagedState>();
            let mut guard = state.lock().await;
            guard.local_db = Some(db);
        }
        Ok(())
    }

    async fn init_cloud(&self, connection_str: &str) -> Result<(), crate::Error> {
        let (client, connection) =
            tokio_postgres::connect(connection_str, tokio_postgres::NoTls).await?;

        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("connection error: {}", e);
            }
        });

        {
            let state = self.state::<crate::ManagedState>();
            let mut guard = state.lock().await;
            guard.cloud_db = Some(client);
        }
        Ok(())
    }

    async fn execute_local(
        &self,
        sql: String,
        args: Vec<String>,
    ) -> Result<Vec<serde_json::Value>, crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let guard = state.lock().await;

        let mut items = Vec::new();

        if let Some(db) = &guard.local_db {
            match db.conn()?.query(&sql, args).await {
                Ok(mut rows) => {
                    while let Some(row) = rows.next().await.unwrap() {
                        let item: serde_json::Value =
                            hypr_db_core::libsql::de::from_row(&row).unwrap();
                        items.push(item);
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to execute local query: {}", e);
                }
            }
        }

        Ok(items)
    }

    async fn execute_cloud(
        &self,
        sql: String,
        args: Vec<String>,
    ) -> Result<Vec<serde_json::Value>, crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let guard = state.lock().await;

        let mut items = Vec::new();

        if let Some(db) = &guard.cloud_db {
            use futures_util::TryStreamExt;
            let mut stream = std::pin::pin!(db.query_raw(&sql, args).await?);

            while let Some(row) = stream.try_next().await? {
                let mut map = serde_json::Map::new();

                for (idx, column) in row.columns().iter().enumerate() {
                    let value = match *column.type_() {
                        tokio_postgres::types::Type::BOOL => row
                            .try_get::<_, Option<bool>>(idx)?
                            .map(|v| serde_json::json!(v)),
                        tokio_postgres::types::Type::INT2 | tokio_postgres::types::Type::INT4 => {
                            row.try_get::<_, Option<i32>>(idx)?
                                .map(|v| serde_json::json!(v))
                        }
                        tokio_postgres::types::Type::INT8 => row
                            .try_get::<_, Option<i64>>(idx)?
                            .map(|v| serde_json::json!(v)),
                        tokio_postgres::types::Type::FLOAT4 => row
                            .try_get::<_, Option<f32>>(idx)?
                            .map(|v| serde_json::json!(v)),
                        tokio_postgres::types::Type::FLOAT8 => row
                            .try_get::<_, Option<f64>>(idx)?
                            .map(|v| serde_json::json!(v)),
                        tokio_postgres::types::Type::TEXT
                        | tokio_postgres::types::Type::VARCHAR => row
                            .try_get::<_, Option<String>>(idx)?
                            .map(|v| serde_json::json!(v)),
                        tokio_postgres::types::Type::JSON | tokio_postgres::types::Type::JSONB => {
                            row.try_get::<_, Option<serde_json::Value>>(idx)?
                        }
                        _ => row
                            .try_get::<_, Option<String>>(idx)?
                            .map(|v| serde_json::json!(v)),
                    };

                    map.insert(
                        column.name().to_string(),
                        value.unwrap_or(serde_json::Value::Null),
                    );
                }

                items.push(serde_json::Value::Object(map));
            }
        }

        Ok(items)
    }
}
