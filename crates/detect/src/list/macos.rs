use super::InstalledApp;
use cidre::core_audio as ca;

#[cfg(target_os = "macos")]
pub fn list_installed_apps() -> Vec<InstalledApp> {
    use std::path::PathBuf;

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

    apps.sort_by(|a, b| a.name.cmp(&b.name));
    apps
}

#[cfg(not(target_os = "macos"))]
pub fn list_installed_apps() -> Vec<InstalledApp> {
    Vec::new()
}

#[cfg(target_os = "macos")]
pub fn list_mic_using_apps() -> Vec<InstalledApp> {
    let processes = ca::System::processes().ok().unwrap();

    let mut out = Vec::<InstalledApp>::new();
    for p in processes {
        if !p.is_running_input().unwrap_or(false) {
            continue;
        }

        if let Ok(pid) = p.pid() {
            if let Some(running_app) = cidre::ns::RunningApp::with_pid(pid) {
                let bundle_id = running_app
                    .bundle_id()
                    .map(|s| s.to_string())
                    .unwrap_or_default();
                let localized_name = running_app
                    .localized_name()
                    .map(|s| s.to_string())
                    .unwrap_or_default();

                out.push(InstalledApp {
                    id: bundle_id,
                    name: localized_name,
                });
            }
        }
    }

    out
}

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
                id: bundle_id,
                name: localized_name,
            });
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    fn test_list_installed_apps() {
        let apps = list_installed_apps();
        println!("Got {} apps\n---", apps.len());
        println!(
            "{}",
            apps.iter()
                .map(|a| format!("- {} ({})", a.name, a.id))
                .collect::<Vec<_>>()
                .join("\n")
        );
    }

    #[test]
    #[ignore]
    fn test_list_mic_using_apps() {
        let apps = list_mic_using_apps();
        println!("Got {} apps\n---", apps.len());
        println!(
            "{}",
            apps.iter()
                .map(|a| format!("- {} ({})", a.name, a.id))
                .collect::<Vec<_>>()
                .join("\n")
        );
    }
}
