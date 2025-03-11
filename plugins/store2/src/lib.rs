mod commands;
mod error;
mod ext;

pub use error::*;
pub use ext::*;

const PLUGIN_NAME: &str = "store2";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::get_str<tauri::Wry>,
            commands::set_str<tauri::Wry>,
            commands::get_bool<tauri::Wry>,
            commands::set_bool<tauri::Wry>,
            commands::get_number<tauri::Wry>,
            commands::set_number<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
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

    fn create_app<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::App<R> {
        builder
            .plugin(tauri_plugin_store::Builder::new().build())
            .plugin(init())
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap()
    }

    #[tokio::test]
    async fn test_store() -> anyhow::Result<()> {
        let app = create_app(tauri::test::mock_builder());
        assert!(app.store().is_ok());

        #[derive(PartialEq, Eq, Hash, strum::Display)]
        enum TestKey {
            #[strum(serialize = "key-a")]
            KeyA,
            #[strum(serialize = "key-b")]
            KeyB,
        }

        impl ScopedStoreKey for TestKey {}

        let scoped_store = app.scoped_store::<TestKey>("test")?;
        assert!(scoped_store.get::<String>(TestKey::KeyA)?.is_none());

        scoped_store.set(TestKey::KeyA, "test".to_string())?;
        assert_eq!(
            scoped_store.get::<String>(TestKey::KeyA)?,
            Some("test".to_string())
        );

        scoped_store.set(TestKey::KeyA, "1".to_string())?;
        assert_eq!(
            scoped_store.get::<String>(TestKey::KeyA)?,
            Some("1".to_string())
        );

        scoped_store.set(TestKey::KeyA, 1)?;
        assert_eq!(scoped_store.get::<u8>(TestKey::KeyA)?, Some(1));

        assert!(scoped_store.get::<String>(TestKey::KeyB)?.is_none());

        Ok(())
    }
}
