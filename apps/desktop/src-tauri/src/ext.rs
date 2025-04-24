use std::future::Future;

use tauri::Manager;
use tauri_plugin_db::DatabasePluginExt;
use tauri_plugin_store2::{ScopedStore, StorePluginExt};

pub trait AppExt<R: tauri::Runtime> {
    fn sentry_dsn(&self) -> String;
    fn desktop_store(&self) -> Result<ScopedStore<R, crate::StoreKey>, String>;
    fn setup_local_ai(&self) -> impl Future<Output = Result<(), String>>;
    fn setup_db_for_local(&self) -> impl Future<Output = Result<(), String>>;
    fn setup_db_for_cloud(&self) -> impl Future<Output = Result<(), String>>;
    fn setup_auto_start(&self) -> impl Future<Output = Result<(), String>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AppExt<R> for T {
    fn sentry_dsn(&self) -> String {
        {
            #[cfg(not(debug_assertions))]
            {
                env!("SENTRY_DSN").to_string()
            }

            #[cfg(debug_assertions)]
            {
                option_env!("SENTRY_DSN").unwrap_or_default().to_string()
            }
        }
    }

    #[tracing::instrument(skip_all)]
    fn desktop_store(&self) -> Result<ScopedStore<R, crate::StoreKey>, String> {
        self.scoped_store("desktop").map_err(|e| e.to_string())
    }

    #[tracing::instrument(skip_all)]
    async fn setup_local_ai(&self) -> Result<(), String> {
        {
            use tauri_plugin_local_stt::{LocalSttPluginExt, SupportedModel};

            let current_model = self
                .get_current_model()
                .unwrap_or(SupportedModel::QuantizedBaseEn);

            if let Ok(true) = self.is_model_downloaded(&current_model).await {
                self.start_server().await.unwrap();
            }
        }

        {
            use tauri_plugin_local_llm::LocalLlmPluginExt;
            if let Ok(true) = self.is_model_downloaded().await {
                self.start_server().await.unwrap();
            }
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn setup_db_for_local(&self) -> Result<(), String> {
        let (db, db_just_created) = {
            if cfg!(debug_assertions) {
                (
                    hypr_db_core::DatabaseBuilder::default()
                        .memory()
                        .build()
                        .await
                        .unwrap(),
                    true,
                )
            } else {
                let local_db_path = self.db_local_path().unwrap();
                let is_existing = std::path::Path::new(&local_db_path).exists();

                (
                    hypr_db_core::DatabaseBuilder::default()
                        .local(local_db_path)
                        .build()
                        .await
                        .unwrap(),
                    !is_existing,
                )
            }
        };

        self.db_attach(db).await.unwrap();

        {
            use tauri_plugin_auth::{AuthPluginExt, StoreKey as AuthStoreKey};

            let (user_id, user_id_just_created) = {
                let stored = self.get_from_store(AuthStoreKey::UserId).unwrap_or(None);
                if let Some(id) = stored {
                    (id, false)
                } else {
                    let store = self.desktop_store();
                    store
                        .unwrap()
                        .set(crate::StoreKey::OnboardingNeeded, true)
                        .unwrap();

                    let id = uuid::Uuid::new_v4().to_string();
                    self.set_in_store(AuthStoreKey::UserId, &id).unwrap();
                    (id, true)
                }
            };

            if let Ok(true) = self.db_ensure_user(&user_id).await {
                use tauri_plugin_analytics::{hypr_analytics, AnalyticsPluginExt};

                let e = hypr_analytics::AnalyticsPayload::for_user(&user_id)
                    .event("user_created")
                    .build();

                if let Err(e) = self.event(e).await {
                    tracing::error!("failed_to_track_user_creation: {}", e);
                }
            }

            {
                let state = self.state::<tauri_plugin_db::ManagedState>();
                let s = state.lock().await;
                let user_db = s.db.as_ref().unwrap();

                user_db.cleanup_sessions().await.unwrap();

                if db_just_created || user_id_just_created {
                    hypr_db_user::init::onboarding(user_db, &user_id)
                        .await
                        .unwrap();
                }

                #[cfg(debug_assertions)]
                hypr_db_user::init::seed(user_db, &user_id).await.unwrap();
            }
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn setup_db_for_cloud(&self) -> Result<(), String> {
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

            let local_db_path = app.db_local_path().unwrap();

            if let Some(account_id) = account_id.as_ref() {
                let db = {
                    if cfg!(debug_assertions) {
                        hypr_db_core::DatabaseBuilder::default().memory()
                    } else {
                        let db_name = format_db_name(account_id);
                        let db_url = format_db_url(&db_name, DEFAULT_ORG_SLUG);

                        hypr_db_core::DatabaseBuilder::default()
                            .local(local_db_path)
                            .remote(db_url, database_token.unwrap())
                    }
                }
                .build()
                .await
                .unwrap();

                app.db_attach(db).await.unwrap();

                #[cfg(debug_assertions)]
                {
                    let state = app.state::<tauri_plugin_db::ManagedState>();
                    let s = state.lock().await;
                    let user_db = s.db.as_ref().unwrap();

                    if let Some(id) = user_id.as_ref() {
                        hypr_db_user::init::seed(user_db, id).await.unwrap();
                    }
                }

                if let Some(id) = user_id.as_ref() {
                    app.db_ensure_user(id).await.unwrap();
                }
            }
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn setup_auto_start(&self) -> Result<(), String> {
        let app = self.app_handle();

        let autostart_manager = {
            use tauri_plugin_autostart::ManagerExt;
            app.autolaunch()
        };

        {
            let state = app.state::<tauri_plugin_db::ManagedState>();
            let guard = state.lock().await;

            let user_db = guard.db.as_ref().unwrap();
            let user_id = guard.user_id.as_ref().unwrap();
            let should_autostart = user_db
                .get_config(user_id)
                .await
                .map_err(|e| e.to_string())?
                .map_or(false, |c| c.general.autostart);

            if should_autostart {
                if let Err(e) = autostart_manager.enable() {
                    tracing::error!("failed_to_enable_auto_start: {}", e);
                }
            } else {
                if let Err(e) = autostart_manager.disable() {
                    tracing::error!("failed_to_disable_auto_start: {}", e);
                }
            }
        }

        Ok(())
    }
}
