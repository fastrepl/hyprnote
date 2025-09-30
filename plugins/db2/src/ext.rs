use std::future::Future;

pub trait Database2PluginExt<R: tauri::Runtime> {
    fn init_local(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn init_cloud(&self, connection_str: &str) -> impl Future<Output = Result<(), crate::Error>>;

    fn execute_local(
        &self,
        sql: String,
        args: Vec<String>,
    ) -> Result<Vec<serde_json::Value>, crate::Error>;
    fn execute_cloud(
        &self,
        sql: String,
        args: Vec<String>,
    ) -> Result<Vec<serde_json::Value>, crate::Error>;
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
            let mut guard = state.lock().unwrap();
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
            let mut guard = state.lock().unwrap();
            guard.cloud_db = Some(client);
        }
        Ok(())
    }

    fn execute_local(
        &self,
        sql: String,
        args: Vec<String>,
    ) -> Result<Vec<serde_json::Value>, crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let guard = state.lock().unwrap();
        if let Some(db) = &guard.local_db {
            let _ = db.conn().unwrap().execute(&sql, args);
        }

        Ok(vec![])
    }
    fn execute_cloud(
        &self,
        sql: String,
        args: Vec<String>,
    ) -> Result<Vec<serde_json::Value>, crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let guard = state.lock().unwrap();
        if let Some(db) = &guard.cloud_db {
            let _ = db.execute_raw(&sql, args);
        }

        Ok(vec![])
    }
}
