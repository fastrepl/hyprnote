use std::collections::HashMap;
use std::path::{Path, PathBuf};

use glob::Pattern;
use rayon::prelude::*;

use crate::folder::is_uuid;
use crate::types::ScanResult;

pub fn list_uuid_files(dir: &Path, ext: &str) -> Vec<(String, PathBuf)> {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return Vec::new();
    };

    entries
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            if !path.is_file() {
                return None;
            }
            if path.extension().and_then(|e| e.to_str()) != Some(ext) {
                return None;
            }
            let stem = path.file_stem()?.to_str()?;
            if !is_uuid(stem) {
                return None;
            }
            Some((stem.to_string(), path))
        })
        .collect()
}

pub fn scan_and_read(base_dir: &Path, file_patterns: &[String], recursive: bool) -> ScanResult {
    if !base_dir.exists() {
        return ScanResult {
            files: HashMap::new(),
            dirs: Vec::new(),
        };
    }

    let patterns: Vec<Pattern> = file_patterns
        .iter()
        .filter_map(|p| Pattern::new(p).ok())
        .collect();

    let mut files = HashMap::new();
    let mut dirs = Vec::new();

    scan_directory_for_files(
        base_dir, base_dir, &patterns, recursive, &mut files, &mut dirs,
    );

    let files: HashMap<String, String> = files
        .into_par_iter()
        .filter_map(|(rel_path, abs_path)| {
            std::fs::read_to_string(&abs_path)
                .ok()
                .map(|content| (rel_path, content))
        })
        .collect();

    ScanResult { files, dirs }
}

fn scan_directory_for_files(
    base_path: &Path,
    current_path: &Path,
    patterns: &[Pattern],
    recursive: bool,
    files: &mut HashMap<String, PathBuf>,
    dirs: &mut Vec<String>,
) {
    let entries = match std::fs::read_dir(current_path) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        if path.is_dir() {
            let rel_path = path
                .strip_prefix(base_path)
                .ok()
                .and_then(|p| p.to_str())
                .map(|s| s.replace(std::path::MAIN_SEPARATOR, "/"))
                .unwrap_or_default();

            if !is_uuid(name) {
                dirs.push(rel_path.clone());
            }

            if recursive && !is_uuid(name) {
                scan_directory_for_files(base_path, &path, patterns, recursive, files, dirs);
            } else if is_uuid(name) {
                scan_directory_for_files(base_path, &path, patterns, false, files, dirs);
            }
        } else if path.is_file() {
            let matches = patterns.iter().any(|p| p.matches(name));
            if matches {
                let rel_path = path
                    .strip_prefix(base_path)
                    .ok()
                    .and_then(|p| p.to_str())
                    .map(|s| s.replace(std::path::MAIN_SEPARATOR, "/"))
                    .unwrap_or_default();
                files.insert(rel_path, path);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_fixtures::{TestEnv, UUID_1, UUID_2};
    use assert_fs::TempDir;

    #[test]
    fn list_uuid_files_nonexistent_dir_returns_empty() {
        let temp = TempDir::new().unwrap();
        let nonexistent = temp.path().join("does_not_exist");

        let result = list_uuid_files(&nonexistent, "md");

        assert!(result.is_empty());
    }

    #[test]
    fn list_uuid_files_empty_dir_returns_empty() {
        let env = TestEnv::new().build();

        let result = list_uuid_files(env.path(), "md");

        assert!(result.is_empty());
    }

    #[test]
    fn list_uuid_files_finds_uuid_files() {
        let env = TestEnv::new()
            .file(&format!("{UUID_1}.md"), "content1")
            .file(&format!("{UUID_2}.md"), "content2")
            .build();

        let result = list_uuid_files(env.path(), "md");

        assert_eq!(result.len(), 2);
        let ids: Vec<_> = result.iter().map(|(id, _)| id.as_str()).collect();
        assert!(ids.contains(&UUID_1));
        assert!(ids.contains(&UUID_2));
    }

    #[test]
    fn list_uuid_files_skips_non_uuid_filenames() {
        let env = TestEnv::new()
            .file(&format!("{UUID_1}.md"), "valid")
            .file("not-a-uuid.md", "skip")
            .file("readme.md", "skip")
            .build();

        let result = list_uuid_files(env.path(), "md");

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].0, UUID_1);
    }

    #[test]
    fn list_uuid_files_skips_wrong_extension() {
        let env = TestEnv::new()
            .file(&format!("{UUID_1}.md"), "valid")
            .file(&format!("{UUID_1}.txt"), "skip")
            .file(&format!("{UUID_1}.json"), "skip")
            .build();

        let result = list_uuid_files(env.path(), "md");

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].0, UUID_1);
    }

    #[test]
    fn list_uuid_files_skips_directories() {
        let env = TestEnv::new()
            .file(&format!("{UUID_1}.md"), "valid")
            .folder(UUID_2)
            .done()
            .build();

        let result = list_uuid_files(env.path(), "md");

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].0, UUID_1);
    }

    #[test]
    fn nonexistent_dir_returns_empty() {
        let temp = TempDir::new().unwrap();
        let nonexistent = temp.path().join("does_not_exist");

        let result = scan_and_read(&nonexistent, &["*.txt".into()], true);

        assert!(result.files.is_empty());
        assert!(result.dirs.is_empty());
    }

    #[test]
    fn matches_files_by_pattern() {
        let env = TestEnv::new()
            .file("note.txt", "hello")
            .file("data.json", "{}")
            .build();

        let result = scan_and_read(env.path(), &["*.txt".into()], false);

        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files.get("note.txt"), Some(&"hello".into()));
    }

    #[test]
    fn recursive_finds_nested_files() {
        let env = TestEnv::new()
            .file("root.txt", "root")
            .folder("sub")
            .file("nested.txt", "nested")
            .done()
            .build();

        let result = scan_and_read(env.path(), &["*.txt".into()], true);

        assert_eq!(result.files.len(), 2);
        assert_eq!(result.files.get("root.txt"), Some(&"root".into()));
        assert_eq!(result.files.get("sub/nested.txt"), Some(&"nested".into()));
    }

    #[test]
    fn non_recursive_skips_nested_files() {
        let env = TestEnv::new()
            .file("root.txt", "root")
            .folder("sub")
            .file("nested.txt", "nested")
            .done()
            .build();

        let result = scan_and_read(env.path(), &["*.txt".into()], false);

        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files.get("root.txt"), Some(&"root".into()));
    }

    #[test]
    fn collects_non_uuid_directories() {
        let env = TestEnv::new()
            .folder("work")
            .done()
            .folder("personal")
            .done()
            .build();

        let result = scan_and_read(env.path(), &["*.txt".into()], true);

        assert!(result.dirs.contains(&"work".into()));
        assert!(result.dirs.contains(&"personal".into()));
    }

    #[test]
    fn uuid_dirs_not_in_dirs_list_but_files_are_scanned() {
        let env = TestEnv::new()
            .folder(UUID_1)
            .file("note.txt", "inside uuid")
            .done()
            .build();

        let result = scan_and_read(env.path(), &["*.txt".into()], false);

        assert!(!result.dirs.iter().any(|d| d.contains(UUID_1)));
        assert_eq!(
            result.files.get(&format!("{UUID_1}/note.txt")),
            Some(&"inside uuid".into())
        );
    }
}
