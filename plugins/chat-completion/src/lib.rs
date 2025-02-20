use tauri::Wry;

mod commands;
mod error;

pub use error::{Error, Result};

const PLUGIN_NAME: &str = "chat-completion";

pub const TEMPLATES: &[(&str, &str)] = &[
    (
        "create_title.system",
        include_str!("../templates/create_title.system.jinja"),
    ),
    (
        "create_title.user",
        include_str!("../templates/create_title.user.jinja"),
    ),
    (
        "enhance.system",
        include_str!("../templates/enhance.system.jinja"),
    ),
    (
        "enhance.user",
        include_str!("../templates/enhance.user.jinja"),
    ),
    (
        "postprocess_enhance.system",
        include_str!("../templates/postprocess_enhance.system.jinja"),
    ),
    (
        "postprocess_enhance.user",
        include_str!("../templates/postprocess_enhance.user.jinja"),
    ),
];

fn make_specta_builder() -> tauri_specta::Builder<Wry> {
    tauri_specta::Builder::<Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            use tauri_plugin_template::TemplatePluginExt;
            for (name, template) in TEMPLATES {
                app.register_template(name.to_string(), template.to_string())
                    .unwrap();
            }
            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        make_specta_builder()
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
