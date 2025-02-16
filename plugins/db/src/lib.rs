use tauri::{Manager, Wry};
use tokio::sync::Mutex;

mod commands;
mod error;

pub use error::{Error, Result};

#[derive(Clone)]
pub struct State {
    user_id: Option<String>,
    db: hypr_db::user::UserDatabase,
}

const PLUGIN_NAME: &str = "db";

fn specta_builder() -> tauri_specta::Builder<Wry> {
    tauri_specta::Builder::<Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::list_calendars,
            commands::list_participants,
            commands::upsert_calendar,
            commands::upsert_session,
            commands::list_templates,
            commands::upsert_template,
            commands::delete_template,
            commands::list_events,
            commands::list_sessions,
            commands::get_session,
            commands::set_session_event,
            commands::get_config,
            commands::set_config,
            commands::get_self_human,
            commands::upsert_human,
            commands::get_self_organization,
            commands::upsert_organization,
            commands::list_chat_groups,
            commands::list_chat_messages,
            commands::create_chat_group,
            commands::upsert_chat_message
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}
pub fn init() -> tauri::plugin::TauriPlugin<Wry> {
    let builder = specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(builder.invoke_handler())
        .setup(|app, _api| {
            let db = tokio::task::block_in_place(|| {
                tokio::runtime::Handle::current().block_on(async move {
                    let conn = hypr_db::ConnectionBuilder::default()
                        .local(":memory:")
                        .connect()
                        .await
                        .unwrap();

                    hypr_db::user::migrate(&conn).await.unwrap();

                    let db = hypr_db::user::UserDatabase::from(conn);

                    #[cfg(debug_assertions)]
                    {
                        hypr_db::user::seed(&db).await.unwrap();
                    }

                    db
                })
            });

            app.manage(Mutex::new(State { user_id: None, db }));
            Ok(())
        })
        .build()
}

pub trait DatabaseExtentionExt<R: tauri::Runtime> {
    fn db_create_new_user(&self) -> Result<String>;
    fn db_set_user_id(&self, user_id: String) -> Result<()>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::DatabaseExtentionExt<R> for T {
    fn db_create_new_user(&self) -> Result<String> {
        let user_id = tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async move {
                let state = self.state::<Mutex<State>>();
                let mut state = state.lock().await;

                let human = state
                    .db
                    .upsert_human(hypr_db::user::Human {
                        is_user: true,
                        ..Default::default()
                    })
                    .await
                    .unwrap();

                state.user_id = Some(human.id.clone());
                human.id
            })
        });

        Ok(user_id)
    }

    fn db_set_user_id(&self, user_id: String) -> Result<()> {
        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async move {
                let state = self.state::<Mutex<State>>();
                let mut state = state.lock().await;

                state.user_id = Some(user_id);
            })
        });

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        specta_builder()
            .export(
                specta_typescript::Typescript::default()
                    .header("// @ts-nocheck\n\n")
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                "./generated/bindings.ts",
            )
            .unwrap()
    }
}
