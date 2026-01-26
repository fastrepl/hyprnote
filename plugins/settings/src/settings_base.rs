use std::path::{Path, PathBuf};

pub const FILENAME: &str = "settings.json";

pub fn compute_default_base(bundle_id: &str) -> Option<PathBuf> {
    let data_dir = dirs::data_dir()?;
    let app_folder = resolve_app_folder(bundle_id);
    Some(data_dir.join(app_folder))
}

pub fn compute_settings_path(base: &Path) -> PathBuf {
    base.join(FILENAME)
}

fn resolve_app_folder(bundle_id: &str) -> &str {
    if cfg!(debug_assertions) || bundle_id == "com.hyprnote.staging" {
        bundle_id
    } else {
        "hyprnote"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_app_folder_returns_bundle_id_for_staging() {
        assert_eq!(
            resolve_app_folder("com.hyprnote.staging"),
            "com.hyprnote.staging"
        );
    }
}
