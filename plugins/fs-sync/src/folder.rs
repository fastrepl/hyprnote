use std::collections::HashSet;
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

        if !is_uuid(name)
            && let Some(found) = find_session_dir_recursive(&path, session_id)
        {
            return Some(found);
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
            // Recursively scan children first to find sessions
            let prev_session_count = result.session_folder_map.len();
            scan_directory_recursive(sessions_dir, &entry_path, result);
            let has_sessions = result.session_folder_map.len() > prev_session_count;

            // Only track folder if it contains sessions (directly or in subfolders)
            if has_sessions {
                result.folders.insert(
                    entry_path.clone(),
                    FolderInfo {
                        name,
                        parent_folder_id: get_parent_folder_path(&entry_path),
                    },
                );
            }
        }
    }
}

pub fn cleanup_files_in_dir(
    dir: &Path,
    extension: &str,
    valid_ids: &HashSet<String>,
) -> std::io::Result<u32> {
    if !dir.exists() {
        return Ok(0);
    }

    let mut removed = 0;

    for entry in std::fs::read_dir(dir)?.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let Some(stem) = path.file_stem().and_then(|n| n.to_str()) else {
            continue;
        };

        if path.extension().and_then(|e| e.to_str()) != Some(extension) {
            continue;
        }

        if !is_uuid(stem) {
            continue;
        }

        if !valid_ids.contains(stem) {
            if let Err(e) = std::fs::remove_file(&path) {
                tracing::warn!("Failed to remove orphan file {:?}: {}", path, e);
            } else {
                tracing::debug!("Removed orphan file: {:?}", path);
                removed += 1;
            }
        }
    }

    Ok(removed)
}

pub fn cleanup_dirs_recursive(
    base_dir: &Path,
    marker_file: &str,
    valid_ids: &HashSet<String>,
) -> std::io::Result<u32> {
    if !base_dir.exists() {
        return Ok(0);
    }

    let orphans = collect_orphan_dirs(base_dir, marker_file, valid_ids);

    let mut removed = 0;
    for dir in orphans {
        if let Err(e) = std::fs::remove_dir_all(&dir) {
            tracing::warn!("Failed to remove orphan dir {:?}: {}", dir, e);
        } else {
            tracing::info!("Removed orphan dir: {:?}", dir);
            removed += 1;
        }
    }

    Ok(removed)
}

pub fn delete_session_dir(session_dir: &Path) -> std::io::Result<()> {
    if session_dir.exists() {
        std::fs::remove_dir_all(session_dir)?;
    }
    Ok(())
}

pub fn cleanup_session_note_files(
    base_dir: &Path,
    valid_note_ids: &HashSet<String>,
    sessions_with_memo: &HashSet<String>,
) -> std::io::Result<u32> {
    if !base_dir.exists() {
        return Ok(0);
    }

    let mut removed = 0;
    cleanup_session_notes_recursive(
        base_dir,
        base_dir,
        valid_note_ids,
        sessions_with_memo,
        &mut removed,
    )?;
    Ok(removed)
}

fn cleanup_session_notes_recursive(
    _base_dir: &Path,
    current_dir: &Path,
    valid_note_ids: &HashSet<String>,
    sessions_with_memo: &HashSet<String>,
    removed: &mut u32,
) -> std::io::Result<()> {
    let entries = match std::fs::read_dir(current_dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        let has_meta = path.join("_meta.json").exists();

        if has_meta && is_uuid(name) {
            cleanup_notes_in_session_dir(&path, name, valid_note_ids, sessions_with_memo, removed)?;
        } else if !is_uuid(name) {
            cleanup_session_notes_recursive(
                _base_dir,
                &path,
                valid_note_ids,
                sessions_with_memo,
                removed,
            )?;
        }
    }

    Ok(())
}

fn cleanup_notes_in_session_dir(
    session_dir: &Path,
    session_id: &str,
    valid_note_ids: &HashSet<String>,
    sessions_with_memo: &HashSet<String>,
    removed: &mut u32,
) -> std::io::Result<()> {
    let entries = match std::fs::read_dir(session_dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
            continue;
        };

        if ext != "md" {
            continue;
        }

        let Some(filename) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        if filename == "_memo.md" {
            if !sessions_with_memo.contains(session_id) && std::fs::remove_file(&path).is_ok() {
                tracing::debug!("Removed orphan memo file: {:?}", path);
                *removed += 1;
            }
            continue;
        }

        let content = match std::fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let note_id = extract_frontmatter_id(&content);
        if let Some(id) = note_id
            && !valid_note_ids.contains(&id)
            && std::fs::remove_file(&path).is_ok()
        {
            tracing::debug!("Removed orphan note file: {:?}", path);
            *removed += 1;
        }
    }

    Ok(())
}

fn extract_frontmatter_id(content: &str) -> Option<String> {
    if !content.starts_with("---") {
        return None;
    }

    let end_marker = content[3..].find("---")?;
    let frontmatter = &content[3..3 + end_marker];

    for line in frontmatter.lines() {
        let line = line.trim();
        if let Some(stripped) = line.strip_prefix("id:") {
            let value = stripped.trim().trim_matches('"').trim_matches('\'');
            if !value.is_empty() {
                return Some(value.to_string());
            }
        }
    }

    None
}

fn collect_orphan_dirs(
    base_dir: &Path,
    marker_file: &str,
    valid_ids: &HashSet<String>,
) -> Vec<PathBuf> {
    let mut orphans = Vec::new();
    collect_orphan_dirs_recursive(base_dir, base_dir, marker_file, valid_ids, &mut orphans);
    orphans
}

fn collect_orphan_dirs_recursive(
    _base_dir: &Path,
    current_dir: &Path,
    marker_file: &str,
    valid_ids: &HashSet<String>,
    orphans: &mut Vec<PathBuf>,
) {
    let entries = match std::fs::read_dir(current_dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        let has_marker = path.join(marker_file).exists();

        if has_marker {
            if is_uuid(name) && !valid_ids.contains(name) {
                orphans.push(path);
            }
        } else if !is_uuid(name) {
            collect_orphan_dirs_recursive(_base_dir, &path, marker_file, valid_ids, orphans);
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
