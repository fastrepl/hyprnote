use std::path::{Path, PathBuf};

use uuid::Uuid;

use crate::types::{FolderInfo, ListFoldersResult};

pub fn is_uuid(name: &str) -> bool {
    Uuid::try_parse(name).is_ok()
}

pub fn find_session_dir(sessions_base: &Path, session_id: &str) -> PathBuf {
    if let Some(found) = find_session_dir_recursive(sessions_base, session_id) {
        return found;
    }
    sessions_base.join(session_id)
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

pub fn get_parent_folder_path(path: &str) -> Option<String> {
    let parts: Vec<&str> = path.split('/').collect();
    if parts.len() <= 1 {
        return None;
    }
    Some(parts[..parts.len() - 1].join("/"))
}

pub fn scan_directory_recursive(
    sessions_dir: &Path,
    current_path: &str,
    result: &mut ListFoldersResult,
) {
    let full_path = if current_path.is_empty() {
        sessions_dir.to_path_buf()
    } else {
        sessions_dir.join(current_path)
    };

    let entries = match std::fs::read_dir(&full_path) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name.to_string(),
            None => continue,
        };

        let entry_path = if current_path.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", current_path, name)
        };

        let has_meta_json = sessions_dir.join(&entry_path).join("_meta.json").exists();

        if has_meta_json {
            result
                .session_folder_map
                .insert(name, current_path.to_string());
        } else if !is_uuid(&name) {
            result.folders.insert(
                entry_path.clone(),
                FolderInfo {
                    name,
                    parent_folder_id: get_parent_folder_path(&entry_path),
                },
            );

            scan_directory_recursive(sessions_dir, &entry_path, result);
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
    fn test_find_session_dir_at_root() {
        let temp = tempfile::tempdir().unwrap();
        let sessions = temp.path().join("sessions");
        let session_id = "550e8400-e29b-41d4-a716-446655440000";
        let expected = sessions.join(session_id);
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
        assert_eq!(result, sessions.join(session_id));
    }
}
