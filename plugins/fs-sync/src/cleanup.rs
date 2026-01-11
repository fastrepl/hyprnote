use std::collections::HashSet;
use std::path::Path;

use crate::path::{is_uuid, to_relative_path};

pub fn cleanup_files_in_dir(
    dir: &Path,
    extension: &str,
    valid_ids: &HashSet<String>,
) -> std::io::Result<u32> {
    if !dir.exists() {
        return Ok(0);
    }

    let base_name = dir.file_name().and_then(|n| n.to_str()).unwrap_or("");

    let orphans: Vec<_> = std::fs::read_dir(dir)?
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            if !path.is_file() {
                return None;
            }
            let stem = path.file_stem()?.to_str()?;
            if path.extension()?.to_str()? != extension || !is_uuid(stem) {
                return None;
            }
            (!valid_ids.contains(stem)).then_some(path)
        })
        .collect();

    let mut removed = 0;
    for path in orphans {
        let relative_path = format!(
            "{}/{}",
            base_name,
            path.file_name().unwrap().to_str().unwrap()
        );
        if let Err(e) = std::fs::remove_file(&path) {
            tracing::warn!(path = %relative_path, error = %e, "failed_to_remove_orphan_file");
        } else {
            tracing::debug!(path = %relative_path, "orphan_file_removed");
            removed += 1;
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

    let mut removed = 0;
    cleanup_dirs_impl(base_dir, base_dir, marker_file, valid_ids, &mut removed);
    Ok(removed)
}

fn cleanup_dirs_impl(
    base_dir: &Path,
    current_dir: &Path,
    marker_file: &str,
    valid_ids: &HashSet<String>,
    removed: &mut u32,
) {
    let Ok(entries) = std::fs::read_dir(current_dir) else {
        return;
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

        if has_marker && is_uuid(name) && !valid_ids.contains(name) {
            let relative_path = to_relative_path(&path, base_dir);
            if let Err(e) = std::fs::remove_dir_all(&path) {
                tracing::warn!(path = %relative_path, error = %e, "failed to remove orphan directory");
            } else {
                tracing::info!(path = %relative_path, "orphan directory removed");
                *removed += 1;
            }
        } else if !has_marker && !is_uuid(name) {
            cleanup_dirs_impl(base_dir, &path, marker_file, valid_ids, removed);
        }
    }
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
    cleanup_notes_impl(
        base_dir,
        base_dir,
        valid_note_ids,
        sessions_with_memo,
        &mut removed,
    );
    Ok(removed)
}

fn cleanup_notes_impl(
    base_dir: &Path,
    current_dir: &Path,
    valid_note_ids: &HashSet<String>,
    sessions_with_memo: &HashSet<String>,
    removed: &mut u32,
) {
    let Ok(entries) = std::fs::read_dir(current_dir) else {
        return;
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
            cleanup_md_files_in_dir(&path, name, valid_note_ids, sessions_with_memo, removed);
        } else if !is_uuid(name) {
            cleanup_notes_impl(base_dir, &path, valid_note_ids, sessions_with_memo, removed);
        }
    }
}

fn cleanup_md_files_in_dir(
    session_dir: &Path,
    session_id: &str,
    valid_note_ids: &HashSet<String>,
    sessions_with_memo: &HashSet<String>,
    removed: &mut u32,
) {
    let Ok(entries) = std::fs::read_dir(session_dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() || path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }

        let Some(filename) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        let should_remove = if filename == "_memo.md" {
            !sessions_with_memo.contains(session_id)
        } else {
            std::fs::read_to_string(&path)
                .ok()
                .and_then(|c| extract_frontmatter_id(&c))
                .is_some_and(|id| !valid_note_ids.contains(&id))
        };

        if should_remove && std::fs::remove_file(&path).is_ok() {
            tracing::debug!(path = %format!("sessions/{}/{}", session_id, filename), "orphan file removed");
            *removed += 1;
        }
    }
}

fn extract_frontmatter_id(content: &str) -> Option<String> {
    crate::frontmatter::deserialize(content)
        .ok()
        .and_then(|doc| doc.frontmatter.get("id").cloned())
        .and_then(|v| v.as_str().map(String::from))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_fixtures::{TestEnv, UUID_1, UUID_2, UUID_3};
    use assert_fs::TempDir;
    use assert_fs::assert::PathAssert;
    use assert_fs::fixture::PathChild;
    use predicates::prelude::*;

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
}
