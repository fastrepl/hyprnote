use std::path::Path;

pub fn should_skip_path(relative_path: &str, path: &Path) -> bool {
    if path.file_name().is_some_and(|name| name == ".DS_Store") {
        return true;
    }

    if relative_path == "store.json" {
        return true;
    }

    if relative_path.starts_with("argmax") {
        return true;
    }

    if path
        .extension()
        .is_some_and(|ext| ext == "wav" || ext == "ogg" || ext == "tmp")
    {
        return true;
    }

    false
}

pub fn to_relative_path(path: &Path, base: &Path) -> String {
    path.strip_prefix(base)
        .unwrap_or(path)
        .to_string_lossy()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_skip_ds_store() {
        let path = PathBuf::from("/some/path/.DS_Store");
        assert!(should_skip_path("some/path/.DS_Store", &path));
    }

    #[test]
    fn test_skip_store_json() {
        let path = PathBuf::from("/vault/store.json");
        assert!(should_skip_path("store.json", &path));
    }

    #[test]
    fn test_skip_argmax_prefix() {
        let path = PathBuf::from("/vault/argmax/some/file.txt");
        assert!(should_skip_path("argmax/some/file.txt", &path));

        let path = PathBuf::from("/vault/argmax_data.json");
        assert!(should_skip_path("argmax_data.json", &path));
    }

    #[test]
    fn test_skip_wav_extension() {
        let path = PathBuf::from("/vault/audio/recording.wav");
        assert!(should_skip_path("audio/recording.wav", &path));
    }

    #[test]
    fn test_skip_ogg_extension() {
        let path = PathBuf::from("/vault/audio/recording.ogg");
        assert!(should_skip_path("audio/recording.ogg", &path));
    }

    #[test]
    fn test_skip_tmp_extension() {
        let path = PathBuf::from("/vault/temp/file.tmp");
        assert!(should_skip_path("temp/file.tmp", &path));
    }

    #[test]
    fn test_allow_regular_files() {
        let path = PathBuf::from("/vault/notes/note.md");
        assert!(!should_skip_path("notes/note.md", &path));

        let path = PathBuf::from("/vault/data.json");
        assert!(!should_skip_path("data.json", &path));

        let path = PathBuf::from("/vault/sessions/session.txt");
        assert!(!should_skip_path("sessions/session.txt", &path));
    }

    #[test]
    fn test_allow_nested_store_json() {
        let path = PathBuf::from("/vault/subdir/store.json");
        assert!(!should_skip_path("subdir/store.json", &path));
    }

    #[test]
    fn test_to_relative_path_strips_base() {
        let base = PathBuf::from("/vault/base");
        let path = PathBuf::from("/vault/base/notes/file.md");
        assert_eq!(to_relative_path(&path, &base), "notes/file.md");
    }

    #[test]
    fn test_to_relative_path_returns_original_if_not_prefixed() {
        let base = PathBuf::from("/different/base");
        let path = PathBuf::from("/vault/notes/file.md");
        assert_eq!(to_relative_path(&path, &base), "/vault/notes/file.md");
    }

    #[test]
    fn test_to_relative_path_handles_exact_match() {
        let base = PathBuf::from("/vault/base");
        let path = PathBuf::from("/vault/base");
        assert_eq!(to_relative_path(&path, &base), "");
    }
}
