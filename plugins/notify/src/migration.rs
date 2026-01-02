use std::path::Path;

use tauri_plugin_path2::Path2PluginExt;

pub use tauri_plugin_folder::{is_uuid, migrate_all_uuid_folders, migrate_session_to_default};

pub fn migrate_uuid_folders<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let base = match app.path2().base() {
        Ok(base) => base,
        Err(e) => {
            tracing::warn!("Failed to get base path for migration: {}", e);
            return;
        }
    };

    let sessions_dir = base.join("sessions");
    if !sessions_dir.exists() {
        return;
    }

    migrate_all_uuid_folders(&sessions_dir);
}

pub fn maybe_migrate_path(base: &Path, relative_path: &str) {
    let parts: Vec<&str> = relative_path.split('/').collect();

    if parts.len() != 2 || parts[0] != "sessions" {
        return;
    }

    let folder_name = parts[1];
    if !is_uuid(folder_name) {
        return;
    }

    let sessions_dir = base.join("sessions");
    migrate_session_to_default(&sessions_dir, folder_name);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_maybe_migrate_path_non_sessions_prefix() {
        let temp = tempfile::tempdir().unwrap();
        let session_id = "550e8400-e29b-41d4-a716-446655440000";
        let other_dir = temp.path().join("other").join(session_id);
        fs::create_dir_all(&other_dir).unwrap();

        maybe_migrate_path(temp.path(), &format!("other/{}", session_id));

        assert!(other_dir.exists());
        assert!(!temp.path().join("other/_default").join(session_id).exists());
    }

    #[test]
    fn test_maybe_migrate_path_wrong_depth() {
        let temp = tempfile::tempdir().unwrap();
        let session_id = "550e8400-e29b-41d4-a716-446655440000";
        let nested = temp.path().join("sessions/nested").join(session_id);
        fs::create_dir_all(&nested).unwrap();

        maybe_migrate_path(temp.path(), &format!("sessions/nested/{}", session_id));

        assert!(nested.exists());
    }

    #[test]
    fn test_maybe_migrate_path_non_uuid_folder() {
        let temp = tempfile::tempdir().unwrap();
        let folder = temp.path().join("sessions/my-folder");
        fs::create_dir_all(&folder).unwrap();

        maybe_migrate_path(temp.path(), "sessions/my-folder");

        assert!(folder.exists());
        assert!(!temp.path().join("sessions/_default/my-folder").exists());
    }

    #[test]
    fn test_maybe_migrate_path_valid_uuid() {
        let temp = tempfile::tempdir().unwrap();
        let session_id = "550e8400-e29b-41d4-a716-446655440000";
        let source = temp.path().join("sessions").join(session_id);
        fs::create_dir_all(&source).unwrap();

        maybe_migrate_path(temp.path(), &format!("sessions/{}", session_id));

        assert!(!source.exists());
        assert!(
            temp.path()
                .join("sessions/_default")
                .join(session_id)
                .exists()
        );
    }

    #[test]
    fn test_maybe_migrate_path_already_migrated() {
        let temp = tempfile::tempdir().unwrap();
        let session_id = "550e8400-e29b-41d4-a716-446655440000";
        let target = temp.path().join("sessions/_default").join(session_id);
        fs::create_dir_all(&target).unwrap();

        maybe_migrate_path(temp.path(), &format!("sessions/{}", session_id));

        assert!(target.exists());
    }
}
