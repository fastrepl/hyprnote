use std::path::Path;

use tauri_plugin_path2::Path2PluginExt;

pub fn run<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
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

    migrate_from_default(&sessions_dir);
}

fn migrate_from_default(sessions_base: &Path) {
    let default_dir = sessions_base.join("_default");
    if !default_dir.exists() {
        return;
    }

    let entries = match std::fs::read_dir(&default_dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name,
            None => continue,
        };

        let target = sessions_base.join(name);
        if target.exists() {
            tracing::warn!(
                "Skipping migration of {}: already exists at root level",
                name
            );
            continue;
        }

        if let Err(e) = std::fs::rename(&path, &target) {
            tracing::warn!("Failed to migrate {} from _default: {}", name, e);
        } else {
            tracing::info!("Migrated session {} from _default to root", name);
        }
    }

    if std::fs::read_dir(&default_dir)
        .map(|mut d| d.next().is_none())
        .unwrap_or(false)
    {
        let _ = std::fs::remove_dir(&default_dir);
        tracing::info!("Removed empty _default directory");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_migrate_from_default() {
        let temp = tempfile::tempdir().unwrap();
        let sessions = temp.path().join("sessions");
        let session_id = "550e8400-e29b-41d4-a716-446655440000";
        let default_dir = sessions.join("_default");
        let source = default_dir.join(session_id);
        fs::create_dir_all(&source).unwrap();

        migrate_from_default(&sessions);

        assert!(!source.exists());
        assert!(sessions.join(session_id).exists());
        assert!(!default_dir.exists());
    }
}
