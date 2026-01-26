use std::path::{Path, PathBuf};

use crate::global::compute_vault_config_path;

pub const VAULT_PATH_KEY: &str = "vault_path";
pub const SETTINGS_FILENAME: &str = "settings.json";

pub fn compute_settings_path(base: &Path) -> PathBuf {
    base.join(SETTINGS_FILENAME)
}
const VAULT_BASE_ENV_VAR: &str = "VAULT_BASE";

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

pub fn resolve_custom(global_base: &Path, default_base: &Path) -> Option<PathBuf> {
    if let Ok(path) = std::env::var(VAULT_BASE_ENV_VAR) {
        let path = expand_path(&path, Some(default_base));
        if path.exists() || std::fs::create_dir_all(&path).is_ok() {
            return Some(path);
        }
    }

    let vault_config_path = compute_vault_config_path(global_base);
    if let Ok(content) = std::fs::read_to_string(vault_config_path)
        && let Ok(settings) = serde_json::from_str::<serde_json::Value>(&content)
        && let Some(custom_base) = settings.get(VAULT_PATH_KEY).and_then(|v| v.as_str())
    {
        let custom_path = expand_path(custom_base, Some(default_base));
        if custom_path.exists() || std::fs::create_dir_all(&custom_path).is_ok() {
            return Some(custom_path);
        }
    }

    None
}

pub fn validate_vault_base_change(old_path: &Path, new_path: &Path) -> Result<(), crate::Error> {
    if new_path == old_path {
        return Ok(());
    }

    if new_path.starts_with(old_path) {
        return Err(crate::Error::VaultBaseIsSubdirectory);
    }

    if old_path.starts_with(new_path) {
        return Err(crate::Error::VaultBaseIsParent);
    }

    Ok(())
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
        let global_base = temp.path().to_path_buf();
        let default_base = temp.path().join("default");

        with_env(VAULT_BASE_ENV_VAR, None, || {
            assert!(resolve_custom(&global_base, &default_base).is_none());
        });
    }

    #[test]
    fn resolve_custom_returns_env_var_path_when_exists() {
        let temp = tempdir().unwrap();
        let global_base = temp.path().to_path_buf();
        let default_base = temp.path().join("default");
        let env_path = temp.path().join("env_content");
        fs::create_dir_all(&env_path).unwrap();

        with_env(VAULT_BASE_ENV_VAR, Some(env_path.to_str().unwrap()), || {
            let result = resolve_custom(&global_base, &default_base);
            assert_eq!(result, Some(env_path.clone()));
        });
    }

    #[test]
    fn resolve_custom_creates_env_var_path_if_missing() {
        let temp = tempdir().unwrap();
        let global_base = temp.path().to_path_buf();
        let default_base = temp.path().join("default");
        let env_path = temp.path().join("new_env_vault");

        with_env(VAULT_BASE_ENV_VAR, Some(env_path.to_str().unwrap()), || {
            let result = resolve_custom(&global_base, &default_base);
            assert_eq!(result, Some(env_path.clone()));
            assert!(env_path.exists());
        });
    }

    #[test]
    fn resolve_custom_reads_from_vault_config() {
        let temp = tempdir().unwrap();
        let global_base = temp.path().to_path_buf();
        let default_base = temp.path().join("default");
        let custom_path = temp.path().join("custom_vault");
        fs::create_dir_all(&custom_path).unwrap();

        let config = serde_json::json!({ VAULT_PATH_KEY: custom_path.to_string_lossy() });
        fs::write(compute_vault_config_path(&global_base), config.to_string()).unwrap();

        with_env(VAULT_BASE_ENV_VAR, None, || {
            let result = resolve_custom(&global_base, &default_base);
            assert_eq!(result, Some(custom_path.clone()));
        });
    }

    #[test]
    fn resolve_custom_env_var_takes_precedence() {
        let temp = tempdir().unwrap();
        let global_base = temp.path().to_path_buf();
        let default_base = temp.path().join("default");
        let env_path = temp.path().join("env_content");
        let file_path = temp.path().join("file_vault");
        fs::create_dir_all(&env_path).unwrap();
        fs::create_dir_all(&file_path).unwrap();

        let config = serde_json::json!({ VAULT_PATH_KEY: file_path.to_string_lossy() });
        fs::write(compute_vault_config_path(&global_base), config.to_string()).unwrap();

        with_env(VAULT_BASE_ENV_VAR, Some(env_path.to_str().unwrap()), || {
            let result = resolve_custom(&global_base, &default_base);
            assert_eq!(result, Some(env_path.clone()));
        });
    }

    #[test]
    fn resolve_custom_creates_vault_path_if_missing() {
        let temp = tempdir().unwrap();
        let global_base = temp.path().to_path_buf();
        let default_base = temp.path().join("default");
        let custom_path = temp.path().join("custom_vault");

        let config = serde_json::json!({ VAULT_PATH_KEY: custom_path.to_string_lossy() });
        fs::write(compute_vault_config_path(&global_base), config.to_string()).unwrap();

        with_env(VAULT_BASE_ENV_VAR, None, || {
            let result = resolve_custom(&global_base, &default_base);
            assert_eq!(result, Some(custom_path.clone()));
            assert!(custom_path.exists());
        });
    }

    #[test]
    fn validate_same_path_returns_ok() {
        let path = PathBuf::from("/home/user/vault");
        assert!(validate_vault_base_change(&path, &path).is_ok());
    }

    #[test]
    fn validate_different_sibling_paths_returns_ok() {
        let old = PathBuf::from("/home/user/content");
        let new = PathBuf::from("/home/user/other");
        assert!(validate_vault_base_change(&old, &new).is_ok());
    }

    #[test]
    fn validate_completely_different_paths_returns_ok() {
        let old = PathBuf::from("/home/user/content");
        let new = PathBuf::from("/var/data/content");
        assert!(validate_vault_base_change(&old, &new).is_ok());
    }

    #[test]
    fn validate_rejects_subdirectory() {
        let old = PathBuf::from("/home/user/vault");
        let new = PathBuf::from("/home/user/vault/subdir");
        let result = validate_vault_base_change(&old, &new);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("subdirectory"));
    }

    #[test]
    fn validate_rejects_nested_subdirectory() {
        let old = PathBuf::from("/home/user/vault");
        let new = PathBuf::from("/home/user/vault/deep/nested/subdir");
        let result = validate_vault_base_change(&old, &new);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("subdirectory"));
    }

    #[test]
    fn validate_rejects_parent_directory() {
        let old = PathBuf::from("/home/user/vault/subdir");
        let new = PathBuf::from("/home/user/vault");
        let result = validate_vault_base_change(&old, &new);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("parent"));
    }

    #[test]
    fn validate_rejects_ancestor_directory() {
        let old = PathBuf::from("/home/user/vault/deep/nested");
        let new = PathBuf::from("/home/user/vault");
        let result = validate_vault_base_change(&old, &new);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("parent"));
    }

    #[test]
    fn validate_similar_prefix_not_ancestor() {
        let old = PathBuf::from("/home/user/vault");
        let new = PathBuf::from("/home/user/vault-backup");
        assert!(validate_vault_base_change(&old, &new).is_ok());
    }
}
