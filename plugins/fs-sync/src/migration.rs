use std::path::Path;

const BASE_DIRECTORIES: &[&str] = &["sessions", "chats"];
const LEGACY_SESSIONS_SUBDIRECTORY: &str = "_default";

pub fn run(base: &Path) {
    create_base_directories(base);
    migrate_sessions_from_legacy_default_subdirectory(&base.join("sessions"));
}

fn create_base_directories(base: &Path) {
    for dir in BASE_DIRECTORIES {
        let path = base.join(dir);
        if let Err(e) = std::fs::create_dir_all(&path) {
            tracing::warn!("Failed to create directory {:?}: {}", path, e);
        }
    }
}

/// Migrates sessions from the old directory structure to the new one.
///
/// Old: `sessions/_default/<session-id>/`
/// New: `sessions/<session-id>/`
fn migrate_sessions_from_legacy_default_subdirectory(sessions_dir: &Path) {
    let legacy_dir = sessions_dir.join(LEGACY_SESSIONS_SUBDIRECTORY);
    if !legacy_dir.exists() {
        return;
    }

    let entries = match std::fs::read_dir(&legacy_dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let source = entry.path();
        if !source.is_dir() {
            continue;
        }

        let Some(session_id) = source.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        let destination = sessions_dir.join(session_id);
        if destination.exists() {
            tracing::warn!(
                "Skipping migration of {}: already exists at root level",
                session_id
            );
            continue;
        }

        match std::fs::rename(&source, &destination) {
            Ok(()) => tracing::info!("Migrated session {} from legacy location", session_id),
            Err(e) => tracing::warn!("Failed to migrate session {}: {}", session_id, e),
        }
    }

    remove_directory_if_empty(&legacy_dir);
}

fn remove_directory_if_empty(path: &Path) {
    let is_empty = std::fs::read_dir(path)
        .map(|mut entries| entries.next().is_none())
        .unwrap_or(false);

    if is_empty {
        let _ = std::fs::remove_dir(path);
        tracing::info!("Removed empty legacy directory: {:?}", path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_migrate_sessions_from_legacy_default_subdirectory() {
        let temp = tempfile::tempdir().unwrap();
        let sessions_dir = temp.path().join("sessions");
        let session_id = "550e8400-e29b-41d4-a716-446655440000";

        let legacy_dir = sessions_dir.join(LEGACY_SESSIONS_SUBDIRECTORY);
        let source = legacy_dir.join(session_id);
        fs::create_dir_all(&source).unwrap();

        migrate_sessions_from_legacy_default_subdirectory(&sessions_dir);

        assert!(!source.exists());
        assert!(sessions_dir.join(session_id).exists());
        assert!(!legacy_dir.exists());
    }
}
