use std::str::FromStr;

use tauri_plugin_windows::WindowsPluginExt;

mod commands;
mod error;
mod ext;

pub use error::*;
pub use ext::*;

const PLUGIN_NAME: &str = "notification";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::show_notification::<tauri::Wry>,
            commands::clear_notifications::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let app_handle = app.clone();
            init_handler(app_handle);
            Ok(())
        })
        .on_event(|app, event| match event {
            tauri::RunEvent::MainEventsCleared => {}
            tauri::RunEvent::Ready => {}
            tauri::RunEvent::WindowEvent { label, event, .. } => {
                if let Ok(tauri_plugin_windows::AppWindow::Main) =
                    tauri_plugin_windows::AppWindow::from_str(label.as_ref())
                {
                    if let tauri::WindowEvent::Focused(true) = event {
                        app.clear_notifications().unwrap();
                    }
                }
            }
            _ => {}
        })
        .build()
}

fn init_handler(app: tauri::AppHandle<tauri::Wry>) {
    hypr_notification::setup_notification_confirm_handler(move |_id| {
        if let Err(_e) = app.windows().show(tauri_plugin_windows::AppWindow::Main) {}
    });

    hypr_notification::setup_notification_dismiss_handler(move |_id| {});
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        const OUTPUT_FILE: &str = "./js/bindings.gen.ts";

        make_specta_builder::<tauri::Wry>()
            .export(
                specta_typescript::Typescript::default()
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                OUTPUT_FILE,
            )
            .unwrap();

        let content = std::fs::read_to_string(OUTPUT_FILE).unwrap();
        std::fs::write(OUTPUT_FILE, format!("// @ts-nocheck\n{content}")).unwrap();
    }
}
