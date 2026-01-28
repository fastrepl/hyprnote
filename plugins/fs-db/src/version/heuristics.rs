use std::path::Path;

use hypr_version::Version;

use super::{DetectedVersion, VaultVersion, VersionSource};

pub fn cold_start(base_dir: &Path) -> DetectedVersion {
    let sqlite_file = base_dir.join("db.sqlite");
    if !sqlite_file.exists() {
        return DetectedVersion::Fresh;
    }

    let sessions_dir = base_dir.join("sessions");
    if !sessions_dir.exists() {
        return DetectedVersion::Known(VaultVersion {
            version: Version::new(1, 0, 1),
            source: VersionSource::Heuristic("cold_start"),
        });
    }

    let has_session_without_meta = std::fs::read_dir(&sessions_dir)
        .ok()
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
                .any(|session_dir| !session_dir.path().join("_meta.json").exists())
        })
        .unwrap_or(false);

    if has_session_without_meta {
        return DetectedVersion::Known(VaultVersion {
            version: Version::new(1, 0, 1),
            source: VersionSource::Heuristic("cold_start"),
        });
    }

    DetectedVersion::Unknown
}
