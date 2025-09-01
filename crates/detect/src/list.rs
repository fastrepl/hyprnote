use std::path::PathBuf;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct InstalledApp {
    pub bundle_id: String,
    pub localized_name: String,
    pub bundle_path: String,
}

#[cfg(target_os = "macos")]
pub fn list_installed_apps() -> Vec<InstalledApp> {
    let app_dirs = [
        "/Applications",
        &format!("{}/Applications", std::env::var("HOME").unwrap_or_default()),
    ];

    let mut apps = Vec::new();

    for dir in &app_dirs {
        let path = PathBuf::from(dir);
        if path.exists() {
            let mut stack = vec![path];

            while let Some(current) = stack.pop() {
                if let Ok(entries) = std::fs::read_dir(&current) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_dir() {
                            if path.extension().and_then(|s| s.to_str()) == Some("app") {
                                if let Some(app) = get_app_info(&path) {
                                    apps.push(app);
                                }
                            } else {
                                stack.push(path);
                            }
                        }
                    }
                }
            }
        }
    }

    apps.sort_by(|a, b| a.localized_name.cmp(&b.localized_name));
    apps
}

#[cfg(target_os = "macos")]
fn get_app_info(app_path: &std::path::Path) -> Option<InstalledApp> {
    let info_plist_path = app_path.join("Contents/Info.plist");

    if let Ok(plist_data) = std::fs::read(&info_plist_path) {
        if let Ok(plist) = plist::from_bytes::<plist::Dictionary>(&plist_data) {
            let bundle_id = plist
                .get("CFBundleIdentifier")
                .and_then(|v| v.as_string())?
                .to_string();

            let localized_name = plist
                .get("CFBundleDisplayName")
                .and_then(|v| v.as_string())
                .or_else(|| plist.get("CFBundleName").and_then(|v| v.as_string()))?
                .to_string();

            return Some(InstalledApp {
                bundle_id,
                localized_name,
                bundle_path: app_path.to_string_lossy().to_string(),
            });
        }
    }

    None
}
