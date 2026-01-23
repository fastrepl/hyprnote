use std::path::{Path, PathBuf};

pub const CONTENT_BASE_PATH_KEY: &str = "base_path";
const CONTENT_BASE_ENV_VAR: &str = "CONTENT_BASE";

fn expand_path(path: &str, default_base: Option<&Path>) -> PathBuf {
    let home_dir = || dirs::home_dir().map(|p| p.to_string_lossy().into_owned());
    let context = |var: &str| -> Option<String> {
        if var == "DEFAULT" {
            return default_base.map(|p| p.to_string_lossy().into_owned());
        }
        std::env::var(var).ok()
    };
    let expanded = shellexpand::full_with_context_no_errors(path, home_dir, context);
    PathBuf::from(expanded.into_owned())
}

pub fn resolve_custom(settings_path: &Path, default_base: &Path) -> Option<PathBuf> {
    if let Ok(path) = std::env::var(CONTENT_BASE_ENV_VAR) {
        let path = expand_path(&path, Some(default_base));
        if path.exists() || std::fs::create_dir_all(&path).is_ok() {
            return Some(path);
        }
    }

    if let Ok(content) = std::fs::read_to_string(settings_path)
        && let Ok(settings) = serde_json::from_str::<serde_json::Value>(&content)
        && let Some(custom_base) = settings.get(CONTENT_BASE_PATH_KEY).and_then(|v| v.as_str())
    {
        let custom_path = expand_path(custom_base, Some(default_base));
        if custom_path.exists() || std::fs::create_dir_all(&custom_path).is_ok() {
            return Some(custom_path);
        }
    }

    None
}

pub fn validate_content_base_change(old_path: &Path, new_path: &Path) -> Result<(), crate::Error> {
    if new_path == old_path {
        return Ok(());
    }

    if new_path.starts_with(old_path) {
        return Err(crate::Error::ContentBaseIsSubdirectory);
    }

    if old_path.starts_with(new_path) {
        return Err(crate::Error::ContentBaseIsParent);
    }

    Ok(())
}

pub fn prepare_settings_json_for_content_base(
    existing_json: Option<&str>,
    new_path: &Path,
) -> Result<String, serde_json::Error> {
    let mut settings = match existing_json {
        Some(content) => {
            serde_json::from_str::<serde_json::Value>(content).unwrap_or(serde_json::json!({}))
        }
        None => serde_json::json!({}),
    };

    if let Some(obj) = settings.as_object_mut() {
        obj.insert(
            CONTENT_BASE_PATH_KEY.to_string(),
            serde_json::Value::String(new_path.to_string_lossy().to_string()),
        );
    }

    serde_json::to_string_pretty(&settings)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::Mutex;
    use tempfile::tempdir;

    static ENV_MUTEX: Mutex<()> = Mutex::new(());

    fn with_env<F, R>(key: &str, value: Option<&str>, f: F) -> R
    where
        F: FnOnce() -> R,
    {
        let _guard = ENV_MUTEX.lock().unwrap();
        let prev = std::env::var(key).ok();

        match value {
            Some(v) => unsafe { std::env::set_var(key, v) },
            None => unsafe { std::env::remove_var(key) },
        }

        let result = f();

        match prev {
            Some(v) => unsafe { std::env::set_var(key, v) },
            None => unsafe { std::env::remove_var(key) },
        }

        result
    }

    #[test]
    fn resolve_custom_returns_none_when_no_sources() {
        let temp = tempdir().unwrap();
        let settings_path = temp.path().join("settings.json");
        let default_base = temp.path().join("default");

        with_env(CONTENT_BASE_ENV_VAR, None, || {
            assert!(resolve_custom(&settings_path, &default_base).is_none());
        });
    }

    #[test]
    fn resolve_custom_returns_env_var_path_when_exists() {
        let temp = tempdir().unwrap();
        let settings_path = temp.path().join("settings.json");
        let default_base = temp.path().join("default");
        let env_path = temp.path().join("env_content");
        fs::create_dir_all(&env_path).unwrap();

        with_env(
            CONTENT_BASE_ENV_VAR,
            Some(env_path.to_str().unwrap()),
            || {
                let result = resolve_custom(&settings_path, &default_base);
                assert_eq!(result, Some(env_path.clone()));
            },
        );
    }

    #[test]
    fn resolve_custom_creates_env_var_path_if_missing() {
        let temp = tempdir().unwrap();
        let settings_path = temp.path().join("settings.json");
        let default_base = temp.path().join("default");
        let env_path = temp.path().join("new_env_content");

        with_env(
            CONTENT_BASE_ENV_VAR,
            Some(env_path.to_str().unwrap()),
            || {
                let result = resolve_custom(&settings_path, &default_base);
                assert_eq!(result, Some(env_path.clone()));
                assert!(env_path.exists());
            },
        );
    }

    #[test]
    fn resolve_custom_reads_from_settings_file() {
        let temp = tempdir().unwrap();
        let settings_path = temp.path().join("settings.json");
        let default_base = temp.path().join("default");
        let custom_path = temp.path().join("custom_content");
        fs::create_dir_all(&custom_path).unwrap();

        let settings = serde_json::json!({ CONTENT_BASE_PATH_KEY: custom_path.to_string_lossy() });
        fs::write(&settings_path, settings.to_string()).unwrap();

        with_env(CONTENT_BASE_ENV_VAR, None, || {
            let result = resolve_custom(&settings_path, &default_base);
            assert_eq!(result, Some(custom_path.clone()));
        });
    }

    #[test]
    fn resolve_custom_env_var_takes_precedence() {
        let temp = tempdir().unwrap();
        let settings_path = temp.path().join("settings.json");
        let default_base = temp.path().join("default");
        let env_path = temp.path().join("env_content");
        let file_path = temp.path().join("file_content");
        fs::create_dir_all(&env_path).unwrap();
        fs::create_dir_all(&file_path).unwrap();

        let settings = serde_json::json!({ CONTENT_BASE_PATH_KEY: file_path.to_string_lossy() });
        fs::write(&settings_path, settings.to_string()).unwrap();

        with_env(
            CONTENT_BASE_ENV_VAR,
            Some(env_path.to_str().unwrap()),
            || {
                let result = resolve_custom(&settings_path, &default_base);
                assert_eq!(result, Some(env_path.clone()));
            },
        );
    }

    #[test]
    fn resolve_custom_creates_settings_path_if_missing() {
        let temp = tempdir().unwrap();
        let settings_path = temp.path().join("settings.json");
        let default_base = temp.path().join("default");
        let custom_path = temp.path().join("custom_content");

        let settings = serde_json::json!({ CONTENT_BASE_PATH_KEY: custom_path.to_string_lossy() });
        fs::write(&settings_path, settings.to_string()).unwrap();

        with_env(CONTENT_BASE_ENV_VAR, None, || {
            let result = resolve_custom(&settings_path, &default_base);
            assert_eq!(result, Some(custom_path.clone()));
            assert!(custom_path.exists());
        });
    }

    #[test]
    fn prepare_settings_json_creates_new_json() {
        let temp = tempdir().unwrap();
        let new_path = temp.path().join("content");

        let result = prepare_settings_json_for_content_base(None, &new_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        assert_eq!(
            parsed.get(CONTENT_BASE_PATH_KEY).and_then(|v| v.as_str()),
            Some(new_path.to_string_lossy().as_ref())
        );
    }

    #[test]
    fn prepare_settings_json_preserves_existing_fields() {
        let temp = tempdir().unwrap();
        let new_path = temp.path().join("content");
        let existing = r#"{"theme": "dark", "language": "en"}"#;

        let result = prepare_settings_json_for_content_base(Some(existing), &new_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed.get("theme").and_then(|v| v.as_str()), Some("dark"));
        assert_eq!(parsed.get("language").and_then(|v| v.as_str()), Some("en"));
        assert_eq!(
            parsed.get(CONTENT_BASE_PATH_KEY).and_then(|v| v.as_str()),
            Some(new_path.to_string_lossy().as_ref())
        );
    }

    #[test]
    fn prepare_settings_json_overwrites_existing_base_path() {
        let temp = tempdir().unwrap();
        let old_path = temp.path().join("old");
        let new_path = temp.path().join("new");
        let existing = serde_json::json!({ CONTENT_BASE_PATH_KEY: old_path.to_string_lossy() });

        let result =
            prepare_settings_json_for_content_base(Some(&existing.to_string()), &new_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        assert_eq!(
            parsed.get(CONTENT_BASE_PATH_KEY).and_then(|v| v.as_str()),
            Some(new_path.to_string_lossy().as_ref())
        );
    }

    #[test]
    fn prepare_settings_json_handles_malformed_json() {
        let temp = tempdir().unwrap();
        let new_path = temp.path().join("content");

        let result =
            prepare_settings_json_for_content_base(Some("not valid json"), &new_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        assert_eq!(
            parsed.get(CONTENT_BASE_PATH_KEY).and_then(|v| v.as_str()),
            Some(new_path.to_string_lossy().as_ref())
        );
    }

    #[test]
    fn validate_same_path_returns_ok() {
        let path = PathBuf::from("/home/user/content");
        assert!(validate_content_base_change(&path, &path).is_ok());
    }

    #[test]
    fn validate_different_sibling_paths_returns_ok() {
        let old = PathBuf::from("/home/user/content");
        let new = PathBuf::from("/home/user/other");
        assert!(validate_content_base_change(&old, &new).is_ok());
    }

    #[test]
    fn validate_completely_different_paths_returns_ok() {
        let old = PathBuf::from("/home/user/content");
        let new = PathBuf::from("/var/data/content");
        assert!(validate_content_base_change(&old, &new).is_ok());
    }

    #[test]
    fn validate_rejects_subdirectory() {
        let old = PathBuf::from("/home/user/content");
        let new = PathBuf::from("/home/user/content/subdir");
        let result = validate_content_base_change(&old, &new);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("subdirectory"));
    }

    #[test]
    fn validate_rejects_nested_subdirectory() {
        let old = PathBuf::from("/home/user/content");
        let new = PathBuf::from("/home/user/content/deep/nested/subdir");
        let result = validate_content_base_change(&old, &new);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("subdirectory"));
    }

    #[test]
    fn validate_rejects_parent_directory() {
        let old = PathBuf::from("/home/user/content/subdir");
        let new = PathBuf::from("/home/user/content");
        let result = validate_content_base_change(&old, &new);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("parent"));
    }

    #[test]
    fn validate_rejects_ancestor_directory() {
        let old = PathBuf::from("/home/user/content/deep/nested");
        let new = PathBuf::from("/home/user/content");
        let result = validate_content_base_change(&old, &new);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("parent"));
    }

    #[test]
    fn validate_similar_prefix_not_ancestor() {
        let old = PathBuf::from("/home/user/content");
        let new = PathBuf::from("/home/user/content-backup");
        assert!(validate_content_base_change(&old, &new).is_ok());
    }
}
