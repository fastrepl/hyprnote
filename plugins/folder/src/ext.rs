use std::path::{Path, PathBuf};

use tauri_plugin_path2::Path2PluginExt;
use uuid::Uuid;

pub fn is_uuid(name: &str) -> bool {
    Uuid::try_parse(name).is_ok()
}

pub fn find_session_dir(sessions_base: &Path, session_id: &str) -> PathBuf {
    if let Some(found) = find_session_dir_recursive(sessions_base, session_id) {
        return found;
    }
    sessions_base.join("_default").join(session_id)
}

fn find_session_dir_recursive(dir: &Path, session_id: &str) -> Option<PathBuf> {
    let entries = std::fs::read_dir(dir).ok()?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let name = path.file_name()?.to_str()?;

        if name == session_id {
            return Some(path);
        }

        if !is_uuid(name) {
            if let Some(found) = find_session_dir_recursive(&path, session_id) {
                return Some(found);
            }
        }
    }

    None
}

pub fn migrate_session_to_default(sessions_base: &Path, session_id: &str) {
    let source = sessions_base.join(session_id);
    if !source.is_dir() {
        return;
    }

    let default_dir = sessions_base.join("_default");
    if !default_dir.exists() {
        if let Err(e) = std::fs::create_dir_all(&default_dir) {
            tracing::warn!("Failed to create _default directory: {}", e);
            return;
        }
    }

    let target = default_dir.join(session_id);
    if target.exists() {
        return;
    }

    if let Err(e) = std::fs::rename(&source, &target) {
        tracing::warn!("Failed to migrate {}: {}", session_id, e);
    } else {
        tracing::info!("Migrated session {} to _default", session_id);
    }
}

pub fn migrate_all_uuid_folders(sessions_base: &Path) {
    let entries = match std::fs::read_dir(sessions_base) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    let default_dir = sessions_base.join("_default");

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name,
            None => continue,
        };

        if !is_uuid(name) {
            continue;
        }

        if !default_dir.exists() {
            if let Err(e) = std::fs::create_dir_all(&default_dir) {
                tracing::warn!("Failed to create _default directory: {}", e);
                return;
            }
        }

        let new_path = default_dir.join(name);
        if new_path.exists() {
            tracing::warn!("Skipping migration of {}: already exists in _default", name);
            continue;
        }

        if let Err(e) = std::fs::rename(&path, &new_path) {
            tracing::warn!("Failed to migrate {}: {}", name, e);
        } else {
            tracing::info!("Migrated session {} to _default", name);
        }
    }
}

pub struct Folder<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Folder<'a, R, M> {
    pub fn ping(&self) -> Result<String, crate::Error> {
        Ok("pong".to_string())
    }

    fn sessions_dir(&self) -> Result<PathBuf, crate::Error> {
        let base = self
            .manager
            .app_handle()
            .path2()
            .base()
            .map_err(|e| crate::Error::Path(e.to_string()))?;
        Ok(base.join("sessions"))
    }

    pub fn move_session(
        &self,
        session_id: &str,
        target_folder_path: &str,
    ) -> Result<(), crate::Error> {
        let sessions_dir = self.sessions_dir()?;
        let source = find_session_dir(&sessions_dir, session_id);

        if !source.exists() {
            return Ok(());
        }

        let target_folder = if target_folder_path.is_empty() {
            sessions_dir.join("_default")
        } else {
            sessions_dir.join(target_folder_path)
        };
        let target = target_folder.join(session_id);

        if source == target {
            return Ok(());
        }

        std::fs::create_dir_all(&target_folder)?;
        std::fs::rename(&source, &target)?;

        tracing::info!(
            "Moved session {} from {:?} to {:?}",
            session_id,
            source,
            target
        );

        Ok(())
    }

    pub fn create_folder(&self, folder_path: &str) -> Result<(), crate::Error> {
        let sessions_dir = self.sessions_dir()?;
        let folder = sessions_dir.join(folder_path);

        if folder.exists() {
            return Ok(());
        }

        std::fs::create_dir_all(&folder)?;
        tracing::info!("Created folder: {:?}", folder);
        Ok(())
    }

    pub fn rename_folder(&self, old_path: &str, new_path: &str) -> Result<(), crate::Error> {
        let sessions_dir = self.sessions_dir()?;
        let source = sessions_dir.join(old_path);
        let target = sessions_dir.join(new_path);

        if !source.exists() {
            return Err(crate::Error::Path(format!(
                "Folder does not exist: {:?}",
                source
            )));
        }

        if target.exists() {
            return Err(crate::Error::Path(format!(
                "Target folder already exists: {:?}",
                target
            )));
        }

        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent)?;
        }

        std::fs::rename(&source, &target)?;
        tracing::info!("Renamed folder from {:?} to {:?}", source, target);
        Ok(())
    }

    pub fn delete_folder(&self, folder_path: &str) -> Result<(), crate::Error> {
        let sessions_dir = self.sessions_dir()?;
        let folder = sessions_dir.join(folder_path);

        if !folder.exists() {
            return Ok(());
        }

        std::fs::remove_dir_all(&folder)?;
        tracing::info!("Deleted folder: {:?}", folder);
        Ok(())
    }
}

pub trait FolderPluginExt<R: tauri::Runtime> {
    fn folder(&self) -> Folder<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> FolderPluginExt<R> for T {
    fn folder(&self) -> Folder<'_, R, Self>
    where
        Self: Sized,
    {
        Folder {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_is_uuid() {
        assert!(is_uuid("550e8400-e29b-41d4-a716-446655440000"));
        assert!(is_uuid("550E8400-E29B-41D4-A716-446655440000"));
        assert!(!is_uuid("_default"));
        assert!(!is_uuid("work"));
        assert!(!is_uuid("not-a-uuid"));
    }

    #[test]
    fn test_find_session_dir_in_default() {
        let temp = tempfile::tempdir().unwrap();
        let sessions = temp.path().join("sessions");
        let session_id = "550e8400-e29b-41d4-a716-446655440000";
        let expected = sessions.join("_default").join(session_id);
        fs::create_dir_all(&expected).unwrap();

        let result = find_session_dir(&sessions, session_id);
        assert_eq!(result, expected);
    }

    #[test]
    fn test_find_session_dir_in_subfolder() {
        let temp = tempfile::tempdir().unwrap();
        let sessions = temp.path().join("sessions");
        let session_id = "550e8400-e29b-41d4-a716-446655440000";
        let expected = sessions.join("work").join("project").join(session_id);
        fs::create_dir_all(&expected).unwrap();

        let result = find_session_dir(&sessions, session_id);
        assert_eq!(result, expected);
    }

    #[test]
    fn test_find_session_dir_fallback() {
        let temp = tempfile::tempdir().unwrap();
        let sessions = temp.path().join("sessions");
        fs::create_dir_all(&sessions).unwrap();

        let session_id = "550e8400-e29b-41d4-a716-446655440000";
        let result = find_session_dir(&sessions, session_id);
        assert_eq!(result, sessions.join("_default").join(session_id));
    }
}
