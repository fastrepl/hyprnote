use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

mod batch;
mod commands;
mod error;
mod events;
mod ext;
mod subtitle;

pub use error::{Error, Result};
pub use events::*;
pub use ext::*;
pub use subtitle::*;

const PLUGIN_NAME: &str = "listener2";

pub type SharedState = Arc<Mutex<State>>;

pub struct State {
    pub app: tauri::AppHandle,
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::run_batch::<tauri::Wry>,
            commands::parse_subtitle::<tauri::Wry>,
            commands::export_to_vtt::<tauri::Wry>,
        ])
        .events(tauri_specta::collect_events![BatchEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            let app_handle = app.app_handle().clone();
            let state: SharedState = Arc::new(Mutex::new(State { app: app_handle }));
            app.manage(state);

            Ok(())
        })
        .build()
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

    #[test]
    fn test_vtt_roundtrip_with_speakers() {
        let temp_dir = std::env::temp_dir();
        let vtt_path = temp_dir.join("test_roundtrip_speakers.vtt");

        let words = vec![
            VttWord {
                text: "Hello world".to_string(),
                start_ms: 0,
                end_ms: 1000,
                speaker: Some("Speaker A".to_string()),
            },
            VttWord {
                text: "How are you".to_string(),
                start_ms: 1000,
                end_ms: 2000,
                speaker: Some("Speaker B".to_string()),
            },
            VttWord {
                text: "I am fine".to_string(),
                start_ms: 2000,
                end_ms: 3000,
                speaker: Some("Speaker A".to_string()),
            },
        ];

        export_words_to_vtt(words.clone(), &vtt_path).unwrap();

        let parsed = parse_subtitle_from_path(&vtt_path).unwrap();

        assert_eq!(parsed.tokens.len(), 3);
        assert_eq!(parsed.tokens[0].text, "Hello world");
        assert_eq!(parsed.tokens[0].speaker, Some("Speaker A".to_string()));
        assert_eq!(parsed.tokens[0].start_time, 0);
        assert_eq!(parsed.tokens[0].end_time, 1000);

        assert_eq!(parsed.tokens[1].text, "How are you");
        assert_eq!(parsed.tokens[1].speaker, Some("Speaker B".to_string()));
        assert_eq!(parsed.tokens[1].start_time, 1000);
        assert_eq!(parsed.tokens[1].end_time, 2000);

        assert_eq!(parsed.tokens[2].text, "I am fine");
        assert_eq!(parsed.tokens[2].speaker, Some("Speaker A".to_string()));
        assert_eq!(parsed.tokens[2].start_time, 2000);
        assert_eq!(parsed.tokens[2].end_time, 3000);

        std::fs::remove_file(&vtt_path).ok();
    }

    #[test]
    fn test_vtt_roundtrip_without_speakers() {
        let temp_dir = std::env::temp_dir();
        let vtt_path = temp_dir.join("test_roundtrip_no_speakers.vtt");

        let words = vec![
            VttWord {
                text: "Hello world".to_string(),
                start_ms: 0,
                end_ms: 1000,
                speaker: None,
            },
            VttWord {
                text: "Goodbye world".to_string(),
                start_ms: 1000,
                end_ms: 2000,
                speaker: None,
            },
        ];

        export_words_to_vtt(words.clone(), &vtt_path).unwrap();

        let parsed = parse_subtitle_from_path(&vtt_path).unwrap();

        assert_eq!(parsed.tokens.len(), 2);
        assert_eq!(parsed.tokens[0].text, "Hello world");
        assert_eq!(parsed.tokens[0].speaker, None);
        assert_eq!(parsed.tokens[1].text, "Goodbye world");
        assert_eq!(parsed.tokens[1].speaker, None);

        std::fs::remove_file(&vtt_path).ok();
    }

    #[test]
    fn test_vtt_roundtrip_mixed_speakers() {
        let temp_dir = std::env::temp_dir();
        let vtt_path = temp_dir.join("test_roundtrip_mixed.vtt");

        let words = vec![
            VttWord {
                text: "Hello".to_string(),
                start_ms: 0,
                end_ms: 500,
                speaker: Some("John".to_string()),
            },
            VttWord {
                text: "World".to_string(),
                start_ms: 500,
                end_ms: 1000,
                speaker: None,
            },
            VttWord {
                text: "Bye".to_string(),
                start_ms: 1000,
                end_ms: 1500,
                speaker: Some("Jane".to_string()),
            },
        ];

        export_words_to_vtt(words.clone(), &vtt_path).unwrap();

        let parsed = parse_subtitle_from_path(&vtt_path).unwrap();

        assert_eq!(parsed.tokens.len(), 3);
        assert_eq!(parsed.tokens[0].speaker, Some("John".to_string()));
        assert_eq!(parsed.tokens[1].speaker, None);
        assert_eq!(parsed.tokens[2].speaker, Some("Jane".to_string()));

        std::fs::remove_file(&vtt_path).ok();
    }
}
