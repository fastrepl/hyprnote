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
    use crate::test_fixtures::{TestEnv, UUID_1};
    use assert_fs::prelude::*;
    use predicates::prelude::*;

    #[test]
    fn migrates_sessions_from_legacy_default_subdirectory() {
        let env = TestEnv::new()
            .folder("sessions")
            .done()
            .folder(&format!("sessions/{LEGACY_SESSIONS_SUBDIRECTORY}"))
            .done()
            .folder(&format!("sessions/{LEGACY_SESSIONS_SUBDIRECTORY}/{UUID_1}"))
            .done()
            .build();

        migrate_sessions_from_legacy_default_subdirectory(&env.path().join("sessions"));

        env.child(&format!("sessions/{LEGACY_SESSIONS_SUBDIRECTORY}/{UUID_1}"))
            .assert(predicate::path::missing());
        env.child("sessions")
            .child(UUID_1)
            .assert(predicate::path::exists());
        env.child(&format!("sessions/{LEGACY_SESSIONS_SUBDIRECTORY}"))
            .assert(predicate::path::missing());
    }

    #[test]
    fn skips_migration_if_destination_exists() {
        let env = TestEnv::new()
            .folder("sessions")
            .done()
            .folder(&format!("sessions/{LEGACY_SESSIONS_SUBDIRECTORY}"))
            .done()
            .folder(&format!("sessions/{LEGACY_SESSIONS_SUBDIRECTORY}/{UUID_1}"))
            .file("old.txt", "old")
            .done()
            .folder(&format!("sessions/{UUID_1}"))
            .file("new.txt", "new")
            .done()
            .build();

        migrate_sessions_from_legacy_default_subdirectory(&env.path().join("sessions"));

        env.child(&format!("sessions/{LEGACY_SESSIONS_SUBDIRECTORY}"))
            .child(UUID_1)
            .assert(predicate::path::exists());
        env.child("sessions")
            .child(UUID_1)
            .child("new.txt")
            .assert("new");
    }

    #[test]
    fn noop_if_no_legacy_directory() {
        let env = TestEnv::new().folder("sessions").done().build();

        migrate_sessions_from_legacy_default_subdirectory(&env.path().join("sessions"));

        env.child("sessions")
            .child(LEGACY_SESSIONS_SUBDIRECTORY)
            .assert(predicate::path::missing());
    }
}
