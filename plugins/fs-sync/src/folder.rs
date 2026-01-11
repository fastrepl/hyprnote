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

    let base_name = dir.file_name().and_then(|n| n.to_str()).unwrap_or("");
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
            let relative_path = path
                .file_name()
                .and_then(|n| n.to_str())
                .map(|name| format!("{}/{}", base_name, name))
                .unwrap_or_else(|| path.display().to_string());

            if let Err(e) = std::fs::remove_file(&path) {
                tracing::warn!(path = %relative_path, error = %e, "failed_to_remove_orphan_file");
            } else {
                tracing::debug!(path = %relative_path, "orphan_file_removed");
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
    let base_name = base_dir.file_name().and_then(|n| n.to_str()).unwrap_or("");

    let mut removed = 0;
    for dir in orphans {
        let relative_path = dir
            .strip_prefix(base_dir)
            .map(|p| format!("{}/{}", base_name, p.display()))
            .unwrap_or_else(|_| dir.display().to_string());

        if let Err(e) = std::fs::remove_dir_all(&dir) {
            tracing::warn!(path = %relative_path, error = %e, "failed to remove orphan directory");
        } else {
            tracing::info!(path = %relative_path, "orphan directory removed");
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
    base_dir: &Path,
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
                base_dir,
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
            if !sessions_with_memo.contains(session_id) {
                if std::fs::remove_file(&path).is_ok() {
                    let relative_path = format!("sessions/{}/{}", session_id, filename);
                    tracing::debug!(path = %relative_path, "orphan memo file removed");
                    *removed += 1;
                }
            }
            continue;
        }

        let content = match std::fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let note_id = extract_frontmatter_id(&content);
        if let Some(id) = note_id {
            if !valid_note_ids.contains(&id) {
                if std::fs::remove_file(&path).is_ok() {
                    let relative_path = format!("sessions/{}/{}", session_id, filename);
                    tracing::debug!(path = %relative_path, "orphan note file removed");
                    *removed += 1;
                }
            }
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
        if line.starts_with("id:") {
            let value = line[3..].trim().trim_matches('"').trim_matches('\'');
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
    base_dir: &Path,
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
            collect_orphan_dirs_recursive(base_dir, &path, marker_file, valid_ids, orphans);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_fixtures::{TestEnv, UUID_1, UUID_2, UUID_3};
    use assert_fs::TempDir;
    use assert_fs::prelude::*;
    use predicates::prelude::*;

    #[test]
    fn test_is_uuid() {
        assert!(is_uuid(UUID_1));
        assert!(is_uuid("550E8400-E29B-41D4-A716-446655440000"));
        assert!(!is_uuid("_default"));
        assert!(!is_uuid("work"));
        assert!(!is_uuid("not-a-uuid"));
    }

    #[test]
    fn find_session_at_root() {
        let env = TestEnv::new()
            .folder("sessions")
            .session(UUID_1)
            .done_folder()
            .done()
            .build();

        let result = find_session_dir(&env.path().join("sessions"), UUID_1);
        assert_eq!(result, env.folder_session_path("sessions", UUID_1));
    }

    #[test]
    fn find_session_in_nested_folder() {
        let env = TestEnv::new()
            .folder("sessions")
            .done()
            .folder("sessions/work")
            .done()
            .folder("sessions/work/project")
            .session(UUID_1)
            .done_folder()
            .done()
            .build();

        let result = find_session_dir(&env.path().join("sessions"), UUID_1);
        assert_eq!(
            result,
            env.path().join("sessions/work/project").join(UUID_1)
        );
    }

    #[test]
    fn find_session_fallback_when_not_found() {
        let temp = TempDir::new().unwrap();
        let sessions = temp.child("sessions");
        sessions.create_dir_all().unwrap();

        let result = find_session_dir(sessions.path(), UUID_1);
        assert_eq!(result, sessions.path().join(UUID_1));
    }

    #[test]
    fn cleanup_files_removes_orphan_uuid_files() {
        let env = TestEnv::new()
            .file(&format!("{UUID_1}.json"), "{}")
            .file(&format!("{UUID_2}.json"), "{}")
            .file("not-uuid.json", "{}")
            .build();

        let valid: HashSet<String> = [UUID_1.to_string()].into();
        let removed = cleanup_files_in_dir(env.path(), "json", &valid).unwrap();

        assert_eq!(removed, 1);
        env.child(&format!("{UUID_1}.json"))
            .assert(predicate::path::exists());
        env.child(&format!("{UUID_2}.json"))
            .assert(predicate::path::missing());
        env.child("not-uuid.json").assert(predicate::path::exists());
    }

    #[test]
    fn cleanup_files_nonexistent_dir_returns_zero() {
        let temp = TempDir::new().unwrap();
        let nonexistent = temp.path().join("nope");

        let removed = cleanup_files_in_dir(&nonexistent, "json", &HashSet::new()).unwrap();
        assert_eq!(removed, 0);
    }

    #[test]
    fn cleanup_dirs_removes_orphan_session_dirs() {
        let env = TestEnv::new()
            .session(UUID_1)
            .done()
            .session(UUID_2)
            .done()
            .build();

        let valid: HashSet<String> = [UUID_1.to_string()].into();
        let removed = cleanup_dirs_recursive(env.path(), "_meta.json", &valid).unwrap();

        assert_eq!(removed, 1);
        env.child(UUID_1).assert(predicate::path::exists());
        env.child(UUID_2).assert(predicate::path::missing());
    }

    #[test]
    fn cleanup_dirs_in_nested_folders() {
        let env = TestEnv::new()
            .folder("work")
            .session(UUID_1)
            .done_folder()
            .session(UUID_2)
            .done_folder()
            .done()
            .build();

        let valid: HashSet<String> = [UUID_1.to_string()].into();
        let removed = cleanup_dirs_recursive(env.path(), "_meta.json", &valid).unwrap();

        assert_eq!(removed, 1);
        env.child("work")
            .child(UUID_1)
            .assert(predicate::path::exists());
        env.child("work")
            .child(UUID_2)
            .assert(predicate::path::missing());
    }

    #[test]
    fn cleanup_session_notes_removes_orphan_notes() {
        let env = TestEnv::new()
            .session(UUID_1)
            .note(UUID_2, "valid")
            .note(UUID_3, "orphan")
            .done()
            .build();

        let valid_notes: HashSet<String> = [UUID_2.to_string()].into();
        let sessions_with_memo: HashSet<String> = HashSet::new();
        let removed =
            cleanup_session_note_files(env.path(), &valid_notes, &sessions_with_memo).unwrap();

        assert_eq!(removed, 1);
        env.child(UUID_1)
            .child(&format!("{UUID_2}.md"))
            .assert(predicate::path::exists());
        env.child(UUID_1)
            .child(&format!("{UUID_3}.md"))
            .assert(predicate::path::missing());
    }

    #[test]
    fn cleanup_session_notes_removes_orphan_memo() {
        let env = TestEnv::new()
            .session(UUID_1)
            .memo("memo content")
            .done()
            .build();

        let valid_notes: HashSet<String> = HashSet::new();
        let sessions_with_memo: HashSet<String> = HashSet::new();
        let removed =
            cleanup_session_note_files(env.path(), &valid_notes, &sessions_with_memo).unwrap();

        assert_eq!(removed, 1);
        env.child(UUID_1)
            .child("_memo.md")
            .assert(predicate::path::missing());
    }

    #[test]
    fn cleanup_session_notes_keeps_valid_memo() {
        let env = TestEnv::new()
            .session(UUID_1)
            .memo("memo content")
            .done()
            .build();

        let valid_notes: HashSet<String> = HashSet::new();
        let sessions_with_memo: HashSet<String> = [UUID_1.to_string()].into();
        let removed =
            cleanup_session_note_files(env.path(), &valid_notes, &sessions_with_memo).unwrap();

        assert_eq!(removed, 0);
        env.child(UUID_1)
            .child("_memo.md")
            .assert(predicate::path::exists());
    }

    #[test]
    fn scan_directory_detects_sessions_with_meta() {
        let env = TestEnv::new()
            .session(UUID_1)
            .done()
            .session(UUID_2)
            .no_meta()
            .done()
            .build();

        let mut result = ListFoldersResult {
            folders: std::collections::HashMap::new(),
            session_folder_map: std::collections::HashMap::new(),
        };
        scan_directory_recursive(env.path(), "", &mut result);

        assert_eq!(result.session_folder_map.len(), 1);
        assert!(result.session_folder_map.contains_key(UUID_1));
        assert!(!result.session_folder_map.contains_key(UUID_2));
    }

    #[test]
    fn scan_directory_tracks_folders_with_sessions() {
        let env = TestEnv::new()
            .folder("work")
            .session(UUID_1)
            .done_folder()
            .done()
            .build();

        let mut result = ListFoldersResult {
            folders: std::collections::HashMap::new(),
            session_folder_map: std::collections::HashMap::new(),
        };
        scan_directory_recursive(env.path(), "", &mut result);

        assert!(result.folders.contains_key("work"));
        assert_eq!(result.folders["work"].name, "work");
    }

    #[test]
    fn delete_session_dir_removes_directory() {
        let env = TestEnv::new().session(UUID_1).done().build();

        delete_session_dir(&env.session_path(UUID_1)).unwrap();
        env.child(UUID_1).assert(predicate::path::missing());
    }

    #[test]
    fn delete_session_dir_noop_if_missing() {
        let temp = TempDir::new().unwrap();
        let missing = temp.path().join(UUID_1);

        let result = delete_session_dir(&missing);
        assert!(result.is_ok());
    }
}
