use std::future::Future;

pub trait AppExt<R: tauri::Runtime> {
    fn setup_db(&self) -> impl Future<Output = Result<(), String>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AppExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn setup_db(&self) -> Result<(), String> {
        let app = self.app_handle();

        let (user_id, account_id, _server_token, database_token) = {
            use tauri_plugin_auth::{AuthPluginExt, StoreKey, VaultKey};

            let user_id = app.get_from_store(StoreKey::UserId).unwrap_or(None);
            let account_id = app.get_from_store(StoreKey::AccountId).unwrap_or(None);

            if let Some(account_id) = account_id.as_ref() {
                app.init_vault(account_id).unwrap();
            }

            let remote_server = account_id
                .as_ref()
                .and_then(|_| app.get_from_vault(VaultKey::RemoteServer).unwrap_or(None));
            let remote_database = account_id
                .as_ref()
                .and_then(|_| app.get_from_vault(VaultKey::RemoteDatabase).unwrap_or(None));

            (user_id, account_id, remote_server, remote_database)
        };

        {
            use hypr_turso::{format_db_name, format_db_url, DEFAULT_ORG_SLUG};
            use tauri_plugin_db::DatabasePluginExt;

            let local_db_path = app.db_local_path();
            if let Some(account_id) = account_id.as_ref() {
                let db = {
                    let mut base = hypr_db_core::DatabaseBuilder::default().local(local_db_path);

                    let db_name = format_db_name(account_id);
                    let db_url = format_db_url(&db_name, DEFAULT_ORG_SLUG);
                    base = base.remote(db_url, database_token.unwrap());

                    base.build().await.unwrap()
                };

                app.db_attach(db).await.unwrap();
                let _ = app.db_sync().await;

                if let Some(user_id) = user_id {
                    app.db_ensure_user(&user_id).await.unwrap();
                }
            }
        }

        Ok(())
    }
}
