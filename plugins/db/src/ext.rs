use std::future::Future;
use tauri::Manager;

pub trait DatabasePluginExt<R: tauri::Runtime> {
    fn db_user_id(&self) -> impl Future<Output = Result<Option<String>, crate::Error>>;
    fn db_local_path(&self) -> Result<String, crate::Error>;
    fn db_attach(
        &self,
        db: hypr_db_core::Database,
    ) -> impl Future<Output = Result<(), crate::Error>>;
    fn db_sync(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn db_ensure_user(
        &self,
        user_id: impl Into<String>,
    ) -> impl Future<Output = Result<(), crate::Error>>;
    fn db_get_config(
        &self,
        user_id: impl Into<String>,
    ) -> impl Future<Output = Result<Option<hypr_db_user::Config>, crate::Error>>;
    fn db_get_session(
        &self,
        session_id: impl Into<String>,
    ) -> impl Future<Output = Result<Option<hypr_db_user::Session>, crate::Error>>;
    fn db_upsert_session(
        &self,
        session: hypr_db_user::Session,
    ) -> impl Future<Output = Result<(), crate::Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> DatabasePluginExt<R> for T {
    async fn db_user_id(&self) -> Result<Option<String>, crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let guard = state.lock().await;
        Ok(guard.user_id.clone())
    }

    fn db_local_path(&self) -> Result<String, crate::Error> {
        let v = {
            let app = self.app_handle();
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;

            dir.join("db.sqlite").to_str().unwrap().to_string()
        };

        tracing::info!(path = %v, "local_db");
        Ok(v)
    }

    async fn db_attach(&self, db: hypr_db_core::Database) -> Result<(), crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let mut s = state.lock().await;

        let user_db = hypr_db_user::UserDatabase::from(db);
        hypr_db_user::migrate(&user_db).await?;

        s.db = Some(user_db);

        Ok(())
    }

    async fn db_sync(&self) -> Result<(), crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let guard = state.lock().await;

        let db = guard.db.as_ref().ok_or(crate::Error::NoneDatabase)?;
        db.sync().await?;
        Ok(())
    }

    async fn db_ensure_user(&self, user_id: impl Into<String>) -> Result<(), crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let mut guard = state.lock().await;

        let user_id_string = user_id.into();
        guard.user_id = Some(user_id_string.clone());

        let db = guard.db.as_ref().ok_or(crate::Error::NoneDatabase)?;

        if db.get_human(&user_id_string).await.unwrap().is_none() {
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
        }

        Ok(())
    }

    async fn db_get_session(
        &self,
        session_id: impl Into<String>,
    ) -> Result<Option<hypr_db_user::Session>, crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let guard = state.lock().await;

        let db = guard.db.as_ref().ok_or(crate::Error::NoneDatabase)?;
        let session = db
            .get_session(hypr_db_user::GetSessionFilter::Id(session_id.into()))
            .await?;
        Ok(session)
    }

    async fn db_upsert_session(&self, session: hypr_db_user::Session) -> Result<(), crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let guard = state.lock().await;

        let db = guard.db.as_ref().ok_or(crate::Error::NoneDatabase)?;
        db.upsert_session(session).await?;

        Ok(())
    }

    async fn db_get_config(
        &self,
        user_id: impl Into<String>,
    ) -> Result<Option<hypr_db_user::Config>, crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let guard = state.lock().await;

        let db = guard.db.as_ref().ok_or(crate::Error::NoneDatabase)?;
        let config = db.get_config(user_id.into()).await?;
        Ok(config)
    }
}
