use tauri::Manager;

pub trait DatabasePluginExt<R: tauri::Runtime> {
    fn local_db_path(&self) -> String;
    fn db_create_new_user(&self) -> Result<String, String>;
    fn db_set_user_id(&self, user_id: String) -> Result<(), String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::DatabasePluginExt<R> for T {
    fn local_db_path(&self) -> String {
        if cfg!(debug_assertions) {
            ":memory:".to_string()
        } else {
            let app = self.app_handle();
            app.path()
                .app_data_dir()
                .unwrap()
                .join("db.sqlite")
                .to_str()
                .unwrap()
                .into()
        }
    }

    fn db_create_new_user(&self) -> Result<String, String> {
        let user_id = tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async move {
                let db = self.state::<hypr_db::user::UserDatabase>();

                let human = db
                    .upsert_human(hypr_db::user::Human {
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
