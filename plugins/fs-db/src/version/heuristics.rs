use std::path::Path;

use hypr_version::Version;

pub fn cold_start(base_dir: &Path) -> Option<Version> {
    let sqlite_file = base_dir.join("db.sqlite");
    if !sqlite_file.exists() {
        return None;
    }

    let sessions_dir = base_dir.join("sessions");
    if !sessions_dir.exists() {
        return Some(Version::new(1, 0, 1));
    }

    let has_session_without_meta = std::fs::read_dir(&sessions_dir)
        .ok()?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .any(|session_dir| !session_dir.path().join("_meta.json").exists());

    if has_session_without_meta {
        return Some(Version::new(1, 0, 1));
    }

    None
}
