mod commands;
mod errors;
mod ext;
mod redaction;

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
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}
pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .js_init_script(JS_INIT_SCRIPT)
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            let env_filter = EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info"))
                .add_directive("ort=warn".parse().unwrap());

            let sentry_layer =
                sentry::integrations::tracing::layer().event_filter(sentry_event_filter);

            if let Some((file_writer, guard)) =
                make_file_writer_if_enabled(true, &app.tracing().logs_dir().unwrap())
            {
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

fn cleanup_old_daily_logs(logs_dir: &PathBuf) -> io::Result<()> {
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

fn make_file_writer_if_enabled(
    enabled: bool,
    logs_dir: &PathBuf,
) -> Option<(tracing_appender::non_blocking::NonBlocking, WorkerGuard)> {
    if !enabled {
        return None;
    }

    let _ = cleanup_old_daily_logs(logs_dir);

    let log_path = logs_dir.join("log");
    let file_appender = FileRotate::new(
        log_path,
        AppendCount::new(5),
        ContentLimit::Bytes(10 * 1024 * 1024),
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
}
