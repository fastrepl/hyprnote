pub struct Database<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Database<'a, R, M> {
    pub async fn user_id(&self) -> Result<Option<String>, crate::Error> {
        let state = self.manager.state::<crate::ManagedState>();
        let guard = state.lock().await;
        Ok(guard.user_id.clone())
    }

    pub fn local_path(&self) -> Result<String, crate::Error> {
        use tauri::path::BaseDirectory;
        let v = {
            let dir = self
                .manager
                .path()
                .resolve("hyprnote", BaseDirectory::Data)?;
            std::fs::create_dir_all(&dir)?;

            dir.join("db.sqlite").to_str().unwrap().to_string()
        };

        tracing::info!(path = %v, "local_db");
        Ok(v)
    }

    pub async fn attach(&self, db: hypr_db_core::Database) -> Result<(), crate::Error> {
        let state = self.manager.state::<crate::ManagedState>();
        let mut s = state.lock().await;

        let user_db = hypr_db_user::UserDatabase::from(db);
        hypr_db_user::migrate(&user_db).await?;

        s.db = Some(user_db);

        Ok(())
    }

    pub async fn sync(&self) -> Result<(), crate::Error> {
        let state = self.manager.state::<crate::ManagedState>();
        let guard = state.lock().await;

        let db = guard.db.as_ref().ok_or(crate::Error::NoneDatabase)?;
        db.sync().await?;
        Ok(())
    }

    pub async fn ensure_user(&self, user_id: impl Into<String>) -> Result<bool, crate::Error> {
        let state = self.manager.state::<crate::ManagedState>();
        let mut guard = state.lock().await;

        let user_id_string = user_id.into();
        guard.user_id = Some(user_id_string.clone());

        let db = guard.db.as_ref().ok_or(crate::Error::NoneDatabase)?;

        match db.get_human(&user_id_string).await? {
            Some(_) => Ok(false),
            None => {
                let human = hypr_db_user::Human {
                    id: user_id_string,
                    is_user: true,
                    organization_id: None,
                    full_name: None,
                    email: None,
                    job_title: None,
                    linkedin_username: None,
                };

                db.upsert_human(human).await?;
                Ok(true)
            }
        }
    }

    pub async fn get_session(
        &self,
        session_id: impl Into<String>,
    ) -> Result<Option<hypr_db_user::Session>, crate::Error> {
        let state = self.manager.state::<crate::ManagedState>();
        let guard = state.lock().await;

        let db = guard.db.as_ref().ok_or(crate::Error::NoneDatabase)?;
        let session = db
            .get_session(hypr_db_user::GetSessionFilter::Id(session_id.into()))
            .await?;
        Ok(session)
    }

    pub async fn upsert_session(&self, session: hypr_db_user::Session) -> Result<(), crate::Error> {
        let state = self.manager.state::<crate::ManagedState>();
        let guard = state.lock().await;

        let db = guard.db.as_ref().ok_or(crate::Error::NoneDatabase)?;
        db.upsert_session(session).await?;

        Ok(())
    }

    pub async fn get_config(
        &self,
        user_id: impl Into<String>,
    ) -> Result<Option<hypr_db_user::Config>, crate::Error> {
        let state = self.manager.state::<crate::ManagedState>();
        let guard = state.lock().await;

        let db = guard.db.as_ref().ok_or(crate::Error::NoneDatabase)?;
        let config = db.get_config(user_id.into()).await?;
        Ok(config)
    }
}

pub trait DatabasePluginExt<R: tauri::Runtime> {
    fn db(&self) -> Database<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> DatabasePluginExt<R> for T {
    fn db(&self) -> Database<'_, R, Self>
    where
        Self: Sized,
    {
        Database {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
