mod commands;
mod errors;
mod ext;
pub mod redaction;

pub use errors::*;
pub use ext::*;

use std::path::PathBuf;
use std::{fs, io};
use tauri::Manager;

use file_rotate::{ContentLimit, FileRotate, compression::Compression, suffix::AppendCount};
use sentry::integrations::tracing::EventFilter;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{
    EnvFilter, fmt, prelude::__tracing_subscriber_SubscriberExt, util::SubscriberInitExt,
};

const PLUGIN_NAME: &str = "tracing";

fn sentry_event_filter(metadata: &tracing::Metadata<'_>) -> EventFilter {
    match *metadata.level() {
        tracing::Level::ERROR | tracing::Level::WARN => EventFilter::Event,
        tracing::Level::INFO => EventFilter::Breadcrumb,
        tracing::Level::DEBUG | tracing::Level::TRACE => EventFilter::Ignore,
    }
}

fn make_specta_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .events(tauri_specta::collect_events![])
        .commands(tauri_specta::collect_commands![
            commands::logs_dir::<tauri::Wry>,
            commands::do_log::<tauri::Wry>,
            commands::log_content::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

#[derive(Default)]
pub struct Builder {
    skip_subscriber_init: bool,
}

impl Builder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn skip_subscriber_init(mut self, skip: bool) -> Self {
        self.skip_subscriber_init = skip;
        self
    }

    pub fn build(self) -> tauri::plugin::TauriPlugin<tauri::Wry> {
        let specta_builder = make_specta_builder();
        let skip_subscriber_init = self.skip_subscriber_init;

        tauri::plugin::Builder::new(PLUGIN_NAME)
            .invoke_handler(specta_builder.invoke_handler())
            .js_init_script(JS_INIT_SCRIPT)
            .setup(move |app, _api| {
                specta_builder.mount_events(app);

                cleanup_legacy_logs(app);

                if skip_subscriber_init {
                    return Ok(());
                }

                let env_filter = EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| EnvFilter::new("info"))
                    .add_directive("ort=warn".parse().unwrap());

                let sentry_layer =
                    sentry::integrations::tracing::layer().event_filter(sentry_event_filter);

                let logs_dir = match app.tracing().logs_dir() {
                    Ok(dir) => dir,
                    Err(e) => {
                        eprintln!("Failed to create logs directory: {}", e);
                        return Ok(());
                    }
                };
                if let Some((file_writer, guard)) = make_file_writer_if_enabled(true, &logs_dir) {
                    tracing_subscriber::Registry::default()
                        .with(env_filter)
                        .with(sentry_layer)
                        .with(fmt::layer())
                        .with(fmt::layer().with_ansi(false).with_writer(file_writer))
                        .init();
                    assert!(app.manage(guard));
                } else {
                    tracing_subscriber::Registry::default()
                        .with(env_filter)
                        .with(sentry_layer)
                        .with(fmt::layer())
                        .init();
                }

                Ok(())
            })
            .build()
    }
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    Builder::new().build()
}

fn cleanup_legacy_logs<M: Manager<tauri::Wry>>(app: &M) {
    let Ok(data_dir) = app.path().data_dir() else {
        return;
    };

    let bundle_id: &str = app.config().identifier.as_ref();
    let app_folder = if cfg!(debug_assertions) || bundle_id == "com.hyprnote.staging" {
        bundle_id
    } else {
        "hyprnote"
    };

    let old_logs_dir = data_dir.join(app_folder);
    if !old_logs_dir.exists() {
        return;
    }

    for name in ["log", "log.1", "log.2", "log.3", "log.4", "log.5"] {
        let _ = fs::remove_file(old_logs_dir.join(name));
    }
}

pub fn cleanup_old_daily_logs(logs_dir: &PathBuf) -> io::Result<()> {
    if !logs_dir.exists() {
        return Ok(());
    }

    for entry in fs::read_dir(logs_dir)? {
        let entry = entry?;
        let path = entry.path();

        if let Some(filename) = path.file_name().and_then(|n| n.to_str())
            && filename.starts_with("log.")
            && filename.len() > 4
        {
            let suffix = &filename[4..];
            if suffix.chars().all(|c| c.is_ascii_digit() || c == '-') {
                let _ = fs::remove_file(path);
            }
        }
    }

    Ok(())
}

pub fn read_log_content(logs_dir: &PathBuf) -> Option<String> {
    const TARGET_LINES: usize = 1000;
    const MAX_ROTATED_FILES: usize = 5;

    let log_files: Vec<_> = std::iter::once(logs_dir.join("app.log"))
        .chain((1..=MAX_ROTATED_FILES).map(|i| logs_dir.join(format!("app.log.{}", i))))
        .collect();

    let mut collected: Vec<String> = Vec::new();

    for log_path in &log_files {
        if collected.len() >= TARGET_LINES {
            break;
        }

        if let Ok(content) = fs::read_to_string(log_path) {
            let lines_needed = TARGET_LINES.saturating_sub(collected.len()) + TARGET_LINES;
            let lines: Vec<String> = content
                .lines()
                .take(lines_needed)
                .map(|s| s.to_string())
                .collect();
            let mut new_collected = lines;
            new_collected.extend(collected);
            collected = new_collected;
        }
    }

    if collected.is_empty() {
        return None;
    }

    let start = collected.len().saturating_sub(TARGET_LINES);
    Some(collected[start..].join("\n"))
}

fn make_file_writer_if_enabled(
    enabled: bool,
    logs_dir: &PathBuf,
) -> Option<(tracing_appender::non_blocking::NonBlocking, WorkerGuard)> {
    if !enabled {
        return None;
    }

    let _ = cleanup_old_daily_logs(logs_dir);

    let log_path = logs_dir.join("app.log");
    let file_appender = FileRotate::new(
        log_path,
        AppendCount::new(5),
        ContentLimit::Bytes(5 * 1024 * 1024),
        Compression::None,
        None,
    );

    let redacting_appender = redaction::RedactingWriter::new(file_appender);

    let (non_blocking, guard) = tracing_appender::non_blocking(redacting_appender);
    Some((non_blocking, guard))
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        const OUTPUT_FILE: &str = "./js/bindings.gen.ts";

        make_specta_builder()
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

    fn create_mock_app() -> tauri::App<tauri::test::MockRuntime> {
        let mut ctx = tauri::test::mock_context(tauri::test::noop_assets());
        ctx.config_mut().identifier = "com.hyprnote.dev".to_string();
        ctx.config_mut().version = Some("0.0.1".to_string());

        tauri::test::mock_builder().build(ctx).unwrap()
    }

    #[test]
    fn test_logs_dir() {
        let app = create_mock_app();
        let result = app.tracing().logs_dir();
        assert!(result.is_ok());
    }

    #[test]
    fn test_log_content_empty() {
        let app = create_mock_app();
        let result = app.tracing().log_content();
        assert!(result.is_ok());
    }

    #[test]
    fn test_do_log() {
        let app = create_mock_app();
        let result = app
            .tracing()
            .do_log(Level::Info, vec![serde_json::json!("test message")]);
        assert!(result.is_ok());
    }
}
