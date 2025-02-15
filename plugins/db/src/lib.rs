use tauri::{Manager, Wry};

mod commands;
mod error;

pub use error::{Error, Result};

pub struct State {
    user_id: String,
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
pub fn init(user_id: impl Into<String>) -> tauri::plugin::TauriPlugin<Wry> {
    let user_id = user_id.into();
    let builder = specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(builder.invoke_handler())
        .setup(|app, _api| {
            let db = tokio::task::block_in_place(|| {
                tokio::runtime::Handle::current().block_on(async move {
                    let conn = {
                        #[cfg(debug_assertions)]
                        {
                            hypr_db::ConnectionBuilder::default().local(":memory:")
                        }

                        #[cfg(not(debug_assertions))]
                        {
                            hypr_db::ConnectionBuilder::default().local(":memory:")
                        }
                    }
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

            app.manage(State { user_id, db });
            Ok(())
        })
        .build()
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
