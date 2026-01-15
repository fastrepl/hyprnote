use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

use tauri_plugin_settings::SettingsPluginExt;

use crate::cleanup::{cleanup_dirs_recursive, cleanup_files_in_dir, cleanup_files_recursive};
use crate::folder::scan_directory_recursive;
use crate::path::is_uuid;
use crate::session::find_session_dir;
use crate::types::CleanupTarget;
use crate::types::ListFoldersResult;

pub struct FsSync<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> FsSync<'a, R, M> {
    fn base_dir(&self) -> Result<PathBuf, crate::Error> {
        self.manager
            .app_handle()
            .settings()
            .base()
            .map_err(|e| crate::Error::Path(e.to_string()))
    }

    fn sessions_dir(&self) -> Result<PathBuf, crate::Error> {
        Ok(self.base_dir()?.join("sessions"))
    }

    pub fn list_folders(&self) -> Result<ListFoldersResult, crate::Error> {
        let sessions_dir = self.sessions_dir()?;

        let mut result = ListFoldersResult {
            folders: HashMap::new(),
            session_folder_map: HashMap::new(),
        };

        if !sessions_dir.exists() {
            return Ok(result);
        }

        scan_directory_recursive(&sessions_dir, "", &mut result);

        Ok(result)
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
            sessions_dir.clone()
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

        if self.folder_contains_sessions(&folder)? {
            return Err(crate::Error::Path(
                "Cannot delete folder containing sessions. Move or delete sessions first."
                    .to_string(),
            ));
        }

        std::fs::remove_dir_all(&folder)?;
        tracing::info!("Deleted folder: {:?}", folder);
        Ok(())
    }

    fn folder_contains_sessions(&self, folder: &PathBuf) -> Result<bool, crate::Error> {
        let entries = std::fs::read_dir(folder)?;

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
                continue;
            };

            if is_uuid(name) && path.join("_meta.json").exists() {
                return Ok(true);
            }

            if !is_uuid(name) && self.folder_contains_sessions(&path)? {
                return Ok(true);
            }
        }

        Ok(false)
    }

    pub fn cleanup_orphan(
        &self,
        target: CleanupTarget,
        valid_ids: Vec<String>,
    ) -> Result<u32, crate::Error> {
        let valid_set: HashSet<String> = valid_ids.into_iter().collect();

        match target {
            CleanupTarget::Files { subdir, extension } => {
                let dir = self.base_dir()?.join(&subdir);
                Ok(cleanup_files_in_dir(&dir, &extension, &valid_set)?)
            }
            CleanupTarget::Dirs {
                subdir,
                marker_file,
            } => {
                let dir = self.base_dir()?.join(&subdir);
                Ok(cleanup_dirs_recursive(&dir, &marker_file, &valid_set)?)
            }
            CleanupTarget::FilesRecursive {
                subdir,
                marker_file,
                extension,
            } => {
                let dir = self.base_dir()?.join(&subdir);
                Ok(cleanup_files_recursive(
                    &dir,
                    &marker_file,
                    &extension,
                    &valid_set,
                )?)
            }
        }
    }
}

pub trait FsSyncPluginExt<R: tauri::Runtime> {
    fn fs_sync(&self) -> FsSync<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> FsSyncPluginExt<R> for T {
    fn fs_sync(&self) -> FsSync<'_, R, Self>
    where
        Self: Sized,
    {
        FsSync {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
