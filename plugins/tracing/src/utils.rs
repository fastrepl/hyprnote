use std::path::PathBuf;
use std::{fs, io};

use file_rotate::{ContentLimit, FileRotate, compression::Compression, suffix::AppendCount};
use tauri::Manager;
use tracing_appender::non_blocking::WorkerGuard;

pub(crate) fn cleanup_legacy_logs<M: Manager<tauri::Wry>>(app: &M) {
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

pub(crate) fn make_file_writer_if_enabled(
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

    let redacting_appender = crate::redaction::RedactingWriter::new(file_appender);

    let (non_blocking, guard) = tracing_appender::non_blocking(redacting_appender);
    Some((non_blocking, guard))
}
