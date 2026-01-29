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
            source: VersionSource::Heuristic("no_sessions_dir"),
        });
    }

    let entries = match std::fs::read_dir(&sessions_dir) {
        Ok(entries) => entries,
        Err(_) => {
            return DetectedVersion::Known(VaultVersion {
                version: latest_nightly(),
                source: VersionSource::Heuristic("sessions_dir_read_error"),
            });
        }
    };

    let session_dirs: Vec<_> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .collect();

    if session_dirs.is_empty() {
        return DetectedVersion::Known(VaultVersion {
            version: latest_nightly(),
            source: VersionSource::Heuristic("empty_sessions_dir"),
        });
    }

    let has_session_without_meta = session_dirs
        .iter()
        .any(|session_dir| !session_dir.path().join("_meta.json").exists());

    if has_session_without_meta {
        return DetectedVersion::Known(VaultVersion {
            version: Version::new(1, 0, 1),
            source: VersionSource::Heuristic("session_without_meta"),
        });
    }

    DetectedVersion::Known(VaultVersion {
        version: latest_nightly(),
        source: VersionSource::Heuristic("all_sessions_have_meta"),
    })
}

fn latest_nightly() -> Version {
    super::super::migrations::latest_migration_version().clone()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_cold_start_fresh_vault() {
        let temp = tempdir().unwrap();
        assert_eq!(cold_start(temp.path()), DetectedVersion::Fresh);
    }

    #[test]
    fn test_cold_start_v1_0_1_no_sessions_dir() {
        let temp = tempdir().unwrap();
        std::fs::File::create(temp.path().join("db.sqlite")).unwrap();

        let result = cold_start(temp.path());
        assert_eq!(
            result,
            DetectedVersion::Known(VaultVersion {
                version: Version::new(1, 0, 1),
                source: VersionSource::Heuristic("no_sessions_dir"),
            })
        );
    }

    #[test]
    fn test_cold_start_v1_0_1_session_without_meta() {
        let temp = tempdir().unwrap();
        std::fs::File::create(temp.path().join("db.sqlite")).unwrap();
        let session_dir = temp.path().join("sessions").join("some-uuid");
        std::fs::create_dir_all(&session_dir).unwrap();

        let result = cold_start(temp.path());
        assert_eq!(
            result,
            DetectedVersion::Known(VaultVersion {
                version: Version::new(1, 0, 1),
                source: VersionSource::Heuristic("session_without_meta"),
            })
        );
    }

    #[test]
    fn test_cold_start_latest_nightly_all_sessions_have_meta() {
        let temp = tempdir().unwrap();
        std::fs::File::create(temp.path().join("db.sqlite")).unwrap();
        let session_dir = temp.path().join("sessions").join("some-uuid");
        std::fs::create_dir_all(&session_dir).unwrap();
        std::fs::File::create(session_dir.join("_meta.json")).unwrap();

        let result = cold_start(temp.path());
        assert_eq!(
            result,
            DetectedVersion::Known(VaultVersion {
                version: latest_nightly(),
                source: VersionSource::Heuristic("all_sessions_have_meta"),
            })
        );
    }

    #[test]
    fn test_cold_start_empty_sessions_dir() {
        let temp = tempdir().unwrap();
        std::fs::File::create(temp.path().join("db.sqlite")).unwrap();
        std::fs::create_dir_all(temp.path().join("sessions")).unwrap();

        let result = cold_start(temp.path());
        assert_eq!(
            result,
            DetectedVersion::Known(VaultVersion {
                version: latest_nightly(),
                source: VersionSource::Heuristic("empty_sessions_dir"),
            })
        );
    }

    #[test]
    fn test_cold_start_sessions_dir_contains_files_not_dirs() {
        let temp = tempdir().unwrap();
        std::fs::File::create(temp.path().join("db.sqlite")).unwrap();
        let sessions_dir = temp.path().join("sessions");
        std::fs::create_dir_all(&sessions_dir).unwrap();
        std::fs::File::create(sessions_dir.join("not-a-dir.txt")).unwrap();

        let result = cold_start(temp.path());
        assert_eq!(
            result,
            DetectedVersion::Known(VaultVersion {
                version: latest_nightly(),
                source: VersionSource::Heuristic("empty_sessions_dir"),
            })
        );
    }
}
