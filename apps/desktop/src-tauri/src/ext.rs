use std::future::Future;

use tauri_plugin_db::DatabasePluginExt;
use tauri_plugin_store2::{ScopedStore, StorePluginExt};

pub trait AppExt<R: tauri::Runtime> {
    fn sentry_dsn(&self) -> String;
    fn desktop_store(&self) -> Result<ScopedStore<R, crate::StoreKey>, String>;
    fn setup_db_for_local(&self) -> impl Future<Output = Result<(), String>>;
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

        let (user_id, user_id_just_created) = {
            use tauri_plugin_auth::{AuthPluginExt, StoreKey as AuthStoreKey};

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

        self.db_attach(db).await.unwrap();

        if let Ok(true) = self.db_ensure_user(&user_id).await {
            use tauri_plugin_analytics::{AnalyticsPayload, AnalyticsPluginExt};

            let e = AnalyticsPayload::for_user(&user_id)
                .event("user_created")
                .build();

            if let Err(e) = self.event(e).await {
                tracing::error!("failed_to_send_analytics: {}", e);
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

        #[cfg(target_os = "macos")]
        {
            use tauri_plugin_apple_calendar::AppleCalendarPluginExt;
            self.start_worker(&user_id).await?;
        }

        {
            use tauri_plugin_notification::NotificationPluginExt;
            self.start_notification_analytics(user_id).unwrap();
        }

        Ok(())
    }
}
