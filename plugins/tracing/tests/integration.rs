use std::fs;
use std::path::PathBuf;

use tauri_plugin_tracing::{cleanup_old_daily_logs, read_log_content};
use tempfile::tempdir;

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
