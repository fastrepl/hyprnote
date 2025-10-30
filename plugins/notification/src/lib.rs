use std::str::FromStr;

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
        .setup(|_app, _api| Ok(()))
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

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        make_specta_builder::<tauri::Wry>()
            .export(
                specta_typescript::Typescript::default()
                    .header("// @ts-nocheck\n\n")
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                "./js/bindings.gen.ts",
            )
            .unwrap()
    }
}
