use std::future::Future;
use tauri::Manager;

pub trait DatabasePluginExt<R: tauri::Runtime> {
    fn local_db_path(&self) -> String;
    fn attach_libsql_db(&self, db: hypr_db_core::Database) -> Result<(), String>;
    fn remote_sync(&self) -> impl Future<Output = Result<(), String>>;

    fn db_create_new_user(&self) -> Result<String, String>;
    fn db_set_user_id(&self, user_id: String) -> Result<(), String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::DatabasePluginExt<R> for T {
    fn local_db_path(&self) -> String {
        let v = match std::env::var("INMEMORY_DB").unwrap_or_default().as_str() {
            "1" | "true" => ":memory:".to_string(),
            _ => {
                let app = self.app_handle();
                let dir = app.path().app_data_dir().unwrap();
                dir.join("db.sqlite").to_str().unwrap().to_string()
            }
        };

        tracing::info!(path = %v, "local_db");
        v
    }

    fn attach_libsql_db(&self, db: hypr_db_core::Database) -> Result<(), String> {
        let state = self.state::<crate::ManagedState>();
        let mut s = state.lock().unwrap();

        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async move {
                let conn = db.connect().unwrap();
                hypr_db_user::migrate(&conn).await.unwrap();

                let user_db = hypr_db_user::UserDatabase::from(conn);
                if cfg!(debug_assertions) {
                    hypr_db_user::seed(&user_db).await.unwrap();
                }

                s.libsql_db = Some(db);
                s.db = Some(user_db);
            })
        });

        Ok(())
    }

    async fn remote_sync(&self) -> Result<(), String> {
        let state = self.state::<crate::ManagedState>();
        let s = state.lock().unwrap();
        let db = s.libsql_db.as_ref().unwrap();
        db.sync().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    fn db_create_new_user(&self) -> Result<String, String> {
        let user_id = tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async move {
                let db = self.state::<hypr_db_user::UserDatabase>();

                let human = db
                    .upsert_human(hypr_db_user::Human {
                        is_user: true,
                        ..Default::default()
                    })
                    .await
                    .unwrap();

                let state = self.state::<crate::ManagedState>();
                let mut s = state.lock().unwrap();

                s.user_id = Some(human.id.clone());
                human.id
            })
        });

        Ok(user_id)
    }

    fn db_set_user_id(&self, user_id: String) -> Result<(), String> {
        let state = self.state::<crate::ManagedState>();
        let mut s = state.lock().unwrap();
        s.user_id = Some(user_id);

        Ok(())
    }
}
