use std::fs;
use std::path::PathBuf;
use std::time::Duration;

use tauri_plugin_tracing::{cleanup_old_daily_logs, read_log_content, redaction::RedactingWriter};
use tempfile::tempdir;

use file_rotate::{ContentLimit, FileRotate, compression::Compression, suffix::AppendCount};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{fmt, prelude::*};

fn create_test_file_writer(
    logs_dir: &PathBuf,
) -> (tracing_appender::non_blocking::NonBlocking, WorkerGuard) {
    let log_path = logs_dir.join("app.log");
    let file_appender = FileRotate::new(
        log_path,
        AppendCount::new(5),
        ContentLimit::Bytes(5 * 1024 * 1024),
        Compression::None,
        None,
    );

    let redacting_appender = RedactingWriter::new(file_appender);
    tracing_appender::non_blocking(redacting_appender)
}

mod e2e {
    use super::*;

    #[test]
    fn test_tracing_with_redaction_e2e() {
        let temp = tempdir().unwrap();
        let logs_dir = temp.path().to_path_buf();
        fs::create_dir_all(&logs_dir).unwrap();

        let home_dir = dirs::home_dir()
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_else(|| "/home/testuser".to_string());

        let (file_writer, guard) = create_test_file_writer(&logs_dir);

        let subscriber = tracing_subscriber::registry()
            .with(fmt::layer().with_ansi(false).with_writer(file_writer));

        tracing::subscriber::with_default(subscriber, || {
            tracing::info!("User logged in from {}/documents", home_dir);
            tracing::warn!("Email notification sent to user@example.com");
            tracing::error!("Connection from 192.168.1.100 failed");
        });

        drop(guard);
        std::thread::sleep(Duration::from_millis(100));

        let log_file = logs_dir.join("app.log");
        assert!(log_file.exists(), "Log file should be created");

        let content = fs::read_to_string(&log_file).unwrap();

        assert!(
            content.contains("[HOME]/documents"),
            "Home path should be redacted. Content: {}",
            content
        );
        assert!(
            content.contains("[EMAIL_REDACTED]"),
            "Email should be redacted. Content: {}",
            content
        );
        assert!(
            content.contains("[IP_REDACTED]"),
            "IP should be redacted. Content: {}",
            content
        );

        assert!(
            !content.contains(&home_dir),
            "Original home path should not appear"
        );
        assert!(
            !content.contains("user@example.com"),
            "Original email should not appear"
        );
        assert!(
            !content.contains("192.168.1.100"),
            "Original IP should not appear"
        );

        assert!(content.contains("User logged in"));
        assert!(content.contains("Email notification"));
        assert!(content.contains("Connection from"));
    }

    #[test]
    fn test_tracing_levels_e2e() {
        let temp = tempdir().unwrap();
        let logs_dir = temp.path().to_path_buf();
        fs::create_dir_all(&logs_dir).unwrap();

        let (file_writer, guard) = create_test_file_writer(&logs_dir);

        let subscriber = tracing_subscriber::registry()
            .with(fmt::layer().with_ansi(false).with_writer(file_writer));

        tracing::subscriber::with_default(subscriber, || {
            tracing::trace!("TRACE level message");
            tracing::debug!("DEBUG level message");
            tracing::info!("INFO level message");
            tracing::warn!("WARN level message");
            tracing::error!("ERROR level message");
        });

        drop(guard);
        std::thread::sleep(Duration::from_millis(100));

        let content = fs::read_to_string(logs_dir.join("app.log")).unwrap();

        assert!(content.contains("INFO") && content.contains("INFO level message"));
        assert!(content.contains("WARN") && content.contains("WARN level message"));
        assert!(content.contains("ERROR") && content.contains("ERROR level message"));
    }

    #[test]
    fn test_log_file_rotation_e2e() {
        let temp = tempdir().unwrap();
        let logs_dir = temp.path().to_path_buf();
        fs::create_dir_all(&logs_dir).unwrap();

        let log_path = logs_dir.join("app.log");
        let file_appender = FileRotate::new(
            log_path,
            AppendCount::new(5),
            ContentLimit::Bytes(1024 * 1024),
            Compression::None,
            None,
        );

        let redacting_appender = RedactingWriter::new(file_appender);
        let (file_writer, guard) = tracing_appender::non_blocking(redacting_appender);

        let subscriber = tracing_subscriber::registry()
            .with(fmt::layer().with_ansi(false).with_writer(file_writer));

        let large_message = "x".repeat(1024);
        tracing::subscriber::with_default(subscriber, || {
            for i in 0..6000 {
                tracing::info!("Log entry {} - {}", i, large_message);
            }
        });

        drop(guard);
        std::thread::sleep(Duration::from_millis(100));

        let app_log = logs_dir.join("app.log");
        assert!(app_log.exists(), "app.log should exist");

        let rotated_exists = (1..=5).any(|i| logs_dir.join(format!("app.log.{}", i)).exists());
        assert!(
            rotated_exists,
            "At least one rotated log file should exist after writing 6MB+ of data"
        );
    }

    #[test]
    fn test_cleanup_old_logs_e2e() {
        let temp = tempdir().unwrap();
        let logs_dir = temp.path().to_path_buf();
        fs::create_dir_all(&logs_dir).unwrap();

        fs::write(logs_dir.join("log.2024-01-15"), "old daily log").unwrap();
        fs::write(logs_dir.join("log.2024-12-31"), "another old daily log").unwrap();
        fs::write(logs_dir.join("app.log"), "current log").unwrap();
        fs::write(logs_dir.join("app.log.1"), "rotated log").unwrap();

        cleanup_old_daily_logs(&logs_dir).unwrap();

        assert!(
            !logs_dir.join("log.2024-01-15").exists(),
            "Old daily logs should be cleaned up"
        );
        assert!(
            !logs_dir.join("log.2024-12-31").exists(),
            "Old daily logs should be cleaned up"
        );
        assert!(
            logs_dir.join("app.log").exists(),
            "Current log should remain"
        );
        assert!(
            logs_dir.join("app.log.1").exists(),
            "Rotated logs should remain"
        );
    }

    #[test]
    fn test_read_log_content_e2e() {
        let temp = tempdir().unwrap();
        let logs_dir = temp.path().to_path_buf();
        fs::create_dir_all(&logs_dir).unwrap();

        let (file_writer, guard) = create_test_file_writer(&logs_dir);

        let subscriber = tracing_subscriber::registry()
            .with(fmt::layer().with_ansi(false).with_writer(file_writer));

        tracing::subscriber::with_default(subscriber, || {
            tracing::info!("TestMarker1");
            tracing::info!("TestMarker2");
            tracing::info!("TestMarker3");
        });

        drop(guard);
        std::thread::sleep(Duration::from_millis(100));

        let content = read_log_content(&logs_dir);
        assert!(content.is_some(), "Should read log content");

        let content = content.unwrap();
        assert!(content.contains("TestMarker1"));
        assert!(content.contains("TestMarker2"));
        assert!(content.contains("TestMarker3"));
    }

    #[test]
    fn test_multiline_redaction_e2e() {
        let temp = tempdir().unwrap();
        let logs_dir = temp.path().to_path_buf();
        fs::create_dir_all(&logs_dir).unwrap();

        let home = dirs::home_dir()
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_else(|| "/home/testuser".to_string());

        let (file_writer, guard) = create_test_file_writer(&logs_dir);

        let subscriber = tracing_subscriber::registry()
            .with(fmt::layer().with_ansi(false).with_writer(file_writer));

        tracing::subscriber::with_default(subscriber, || {
            tracing::info!("Line 1: Path is {}/test", home);
            tracing::info!("Line 2: Contact admin@company.com");
            tracing::info!("Line 3: Server at 172.16.0.1");
        });

        drop(guard);
        std::thread::sleep(Duration::from_millis(100));

        let content = fs::read_to_string(logs_dir.join("app.log")).unwrap();

        assert!(
            content.contains("[HOME]/test"),
            "Home path should be redacted"
        );
        assert!(
            content.contains("[EMAIL_REDACTED]"),
            "Email should be redacted"
        );
        assert!(content.contains("[IP_REDACTED]"), "IP should be redacted");

        assert!(!content.contains(&home), "Original home should not appear");
        assert!(
            !content.contains("admin@company.com"),
            "Original email should not appear"
        );
        assert!(
            !content.contains("172.16.0.1"),
            "Original IP should not appear"
        );
    }

    #[test]
    fn test_redacting_writer_with_file_rotate_direct() {
        use std::io::Write;

        let temp = tempdir().unwrap();
        let logs_dir = temp.path().to_path_buf();
        fs::create_dir_all(&logs_dir).unwrap();

        let log_path = logs_dir.join("app.log");
        let file_appender = FileRotate::new(
            log_path,
            AppendCount::new(5),
            ContentLimit::Bytes(100),
            Compression::None,
            None,
        );

        let mut redacting_writer = RedactingWriter::new(file_appender);

        let home = dirs::home_dir()
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_else(|| "/home/testuser".to_string());

        writeln!(redacting_writer, "Log entry with {}/path", home).unwrap();
        writeln!(redacting_writer, "Email: test@example.com").unwrap();
        writeln!(redacting_writer, "IP: 192.168.1.1").unwrap();
        redacting_writer.flush().unwrap();

        std::thread::sleep(Duration::from_millis(50));

        let content = fs::read_to_string(logs_dir.join("app.log")).unwrap();

        assert!(content.contains("[HOME]/path"));
        assert!(content.contains("[EMAIL_REDACTED]"));
        assert!(content.contains("[IP_REDACTED]"));
        assert!(!content.contains(&home));
        assert!(!content.contains("test@example.com"));
        assert!(!content.contains("192.168.1.1"));
    }

    #[test]
    fn test_structured_logging_with_redaction_e2e() {
        let temp = tempdir().unwrap();
        let logs_dir = temp.path().to_path_buf();
        fs::create_dir_all(&logs_dir).unwrap();

        let home = dirs::home_dir()
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_else(|| "/home/testuser".to_string());

        let (file_writer, guard) = create_test_file_writer(&logs_dir);

        let subscriber = tracing_subscriber::registry()
            .with(fmt::layer().with_ansi(false).with_writer(file_writer));

        tracing::subscriber::with_default(subscriber, || {
            tracing::info!(
                path = format!("{}/config", home),
                email = "admin@example.org",
                ip = "10.0.0.1",
                "Structured log with sensitive fields"
            );
        });

        drop(guard);
        std::thread::sleep(Duration::from_millis(100));

        let content = fs::read_to_string(logs_dir.join("app.log")).unwrap();

        assert!(
            content.contains("[HOME]/config") || content.contains("[HOME]"),
            "Home path in structured field should be redacted"
        );
        assert!(
            content.contains("[EMAIL_REDACTED]"),
            "Email in structured field should be redacted"
        );
        assert!(
            content.contains("[IP_REDACTED]"),
            "IP in structured field should be redacted"
        );
    }
}

#[test]
fn cleanup_old_daily_logs_removes_matching_files() {
    let temp = tempdir().unwrap();
    let logs_dir = temp.path().to_path_buf();

    fs::write(logs_dir.join("log.2024-01-15"), "old log").unwrap();
    fs::write(logs_dir.join("log.2024-01-16"), "old log").unwrap();
    fs::write(logs_dir.join("log.2024-12-31"), "old log").unwrap();

    cleanup_old_daily_logs(&logs_dir).unwrap();

    assert!(!logs_dir.join("log.2024-01-15").exists());
    assert!(!logs_dir.join("log.2024-01-16").exists());
    assert!(!logs_dir.join("log.2024-12-31").exists());
}

#[test]
fn cleanup_old_daily_logs_preserves_non_matching() {
    let temp = tempdir().unwrap();
    let logs_dir = temp.path().to_path_buf();

    fs::write(logs_dir.join("app.log"), "current log").unwrap();
    fs::write(logs_dir.join("app.log.1"), "rotated log").unwrap();
    fs::write(logs_dir.join("other.txt"), "other file").unwrap();
    fs::write(logs_dir.join("log.2024-01-15"), "old log").unwrap();

    cleanup_old_daily_logs(&logs_dir).unwrap();

    assert!(logs_dir.join("app.log").exists());
    assert!(logs_dir.join("app.log.1").exists());
    assert!(logs_dir.join("other.txt").exists());
    assert!(!logs_dir.join("log.2024-01-15").exists());
}

#[test]
fn cleanup_old_daily_logs_handles_empty_dir() {
    let temp = tempdir().unwrap();
    let logs_dir = temp.path().to_path_buf();

    let result = cleanup_old_daily_logs(&logs_dir);
    assert!(result.is_ok());
}

#[test]
fn cleanup_old_daily_logs_handles_nonexistent_dir() {
    let logs_dir = PathBuf::from("/nonexistent/path/that/does/not/exist");

    let result = cleanup_old_daily_logs(&logs_dir);
    assert!(result.is_ok());
}

#[test]
fn cleanup_old_daily_logs_preserves_log_without_date_suffix() {
    let temp = tempdir().unwrap();
    let logs_dir = temp.path().to_path_buf();

    fs::write(logs_dir.join("log.txt"), "log file").unwrap();
    fs::write(logs_dir.join("log.backup"), "backup").unwrap();

    cleanup_old_daily_logs(&logs_dir).unwrap();

    assert!(logs_dir.join("log.txt").exists());
    assert!(logs_dir.join("log.backup").exists());
}

#[test]
fn read_log_content_returns_none_for_empty_dir() {
    let temp = tempdir().unwrap();
    let logs_dir = temp.path().to_path_buf();

    let result = read_log_content(&logs_dir);
    assert!(result.is_none());
}

#[test]
fn read_log_content_reads_single_file() {
    let temp = tempdir().unwrap();
    let logs_dir = temp.path().to_path_buf();

    fs::write(logs_dir.join("app.log"), "line1\nline2\nline3").unwrap();

    let result = read_log_content(&logs_dir);
    assert!(result.is_some());
    let content = result.unwrap();
    assert!(content.contains("line1"));
    assert!(content.contains("line2"));
    assert!(content.contains("line3"));
}

#[test]
fn read_log_content_joins_rotated_files() {
    let temp = tempdir().unwrap();
    let logs_dir = temp.path().to_path_buf();

    fs::write(logs_dir.join("app.log"), "newest").unwrap();
    fs::write(logs_dir.join("app.log.1"), "older1").unwrap();
    fs::write(logs_dir.join("app.log.2"), "older2").unwrap();

    let result = read_log_content(&logs_dir);
    assert!(result.is_some());
    let content = result.unwrap();

    assert!(content.contains("newest"));
    assert!(content.contains("older1"));
    assert!(content.contains("older2"));

    let lines: Vec<&str> = content.lines().collect();
    let newest_pos = lines.iter().position(|&l| l == "newest").unwrap();
    let older1_pos = lines.iter().position(|&l| l == "older1").unwrap();
    let older2_pos = lines.iter().position(|&l| l == "older2").unwrap();
    assert!(older2_pos < older1_pos);
    assert!(older1_pos < newest_pos);
}

#[test]
fn read_log_content_handles_missing_rotated_files() {
    let temp = tempdir().unwrap();
    let logs_dir = temp.path().to_path_buf();

    fs::write(logs_dir.join("app.log"), "current").unwrap();
    fs::write(logs_dir.join("app.log.3"), "old").unwrap();

    let result = read_log_content(&logs_dir);
    assert!(result.is_some());
    let content = result.unwrap();
    assert!(content.contains("current"));
    assert!(content.contains("old"));
}

#[test]
fn read_log_content_limits_to_1000_lines() {
    let temp = tempdir().unwrap();
    let logs_dir = temp.path().to_path_buf();

    let many_lines: String = (0..1500).map(|i| format!("line{}\n", i)).collect();
    fs::write(logs_dir.join("app.log"), &many_lines).unwrap();

    let result = read_log_content(&logs_dir);
    assert!(result.is_some());
    let content = result.unwrap();
    let line_count = content.lines().count();
    assert_eq!(line_count, 1000);

    assert!(content.contains("line1499"));
    assert!(content.contains("line500"));
    assert!(!content.contains("line0\n"));
}

#[test]
fn read_log_content_limits_across_multiple_files() {
    let temp = tempdir().unwrap();
    let logs_dir = temp.path().to_path_buf();

    let lines_per_file = 400;
    let app_log: String = (0..lines_per_file)
        .map(|i| format!("app_{}\n", i))
        .collect();
    let log1: String = (0..lines_per_file)
        .map(|i| format!("log1_{}\n", i))
        .collect();
    let log2: String = (0..lines_per_file)
        .map(|i| format!("log2_{}\n", i))
        .collect();

    fs::write(logs_dir.join("app.log"), &app_log).unwrap();
    fs::write(logs_dir.join("app.log.1"), &log1).unwrap();
    fs::write(logs_dir.join("app.log.2"), &log2).unwrap();

    let result = read_log_content(&logs_dir);
    assert!(result.is_some());
    let content = result.unwrap();
    let line_count = content.lines().count();
    assert_eq!(line_count, 1000);

    assert!(content.contains("app_0"));
    assert!(content.contains("log1_0"));
}

#[test]
fn read_log_content_empty_files() {
    let temp = tempdir().unwrap();
    let logs_dir = temp.path().to_path_buf();

    fs::write(logs_dir.join("app.log"), "").unwrap();

    let result = read_log_content(&logs_dir);
    assert!(result.is_none());
}

#[test]
fn read_log_content_preserves_line_order() {
    let temp = tempdir().unwrap();
    let logs_dir = temp.path().to_path_buf();

    fs::write(logs_dir.join("app.log"), "a\nb\nc").unwrap();
    fs::write(logs_dir.join("app.log.1"), "d\ne\nf").unwrap();

    let result = read_log_content(&logs_dir);
    assert!(result.is_some());
    let content = result.unwrap();
    let lines: Vec<&str> = content.lines().collect();

    assert_eq!(lines, vec!["d", "e", "f", "a", "b", "c"]);
}
