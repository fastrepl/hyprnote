use std::path::{Path, PathBuf};

use cidre::core_audio as ca;
use sysinfo::{Pid, System};

use super::InstalledApp;

#[cfg(target_os = "macos")]
pub fn list_installed_apps() -> Vec<InstalledApp> {
    let app_dirs = [
        "/Applications".to_string(),
        format!("{}/Applications", std::env::var("HOME").unwrap_or_default()),
    ];

    let mut apps = Vec::new();

    for dir in app_dirs {
        let path = PathBuf::from(dir);
        if !path.exists() {
            continue;
        }

        let mut stack = vec![path];
        while let Some(current) = stack.pop() {
            let Ok(entries) = std::fs::read_dir(&current) else {
                continue;
            };

            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_dir() {
                    continue;
                }

                if is_app_bundle(&path) {
                    if let Some(app) = read_app_info(&path) {
                        apps.push(app);
                    }
                } else {
                    stack.push(path);
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
    let Ok(processes) = ca::System::processes() else {
        return Vec::new();
    };

    processes
        .into_iter()
        .filter(|p| p.is_running_input().unwrap_or(false))
        .filter_map(|p| p.pid().ok())
        .filter_map(resolve_to_app)
        .collect()
}

fn resolve_to_app(pid: i32) -> Option<InstalledApp> {
    resolve_via_nsrunningapp(pid).or_else(|| resolve_via_sysinfo(pid))
}

fn resolve_via_nsrunningapp(pid: i32) -> Option<InstalledApp> {
    let running_app = cidre::ns::RunningApp::with_pid(pid)?;

    if let Some(bundle_url) = running_app.bundle_url() {
        if let Some(path_ns) = bundle_url.path() {
            let path_str = path_ns.to_string();
            if let Some(app) = find_outermost_app(Path::new(&path_str)) {
                return Some(app);
            }
        }
    }

    let bundle_id = running_app.bundle_id()?.to_string();
    let name = running_app
        .localized_name()
        .map(|s| s.to_string())
        .unwrap_or_else(|| bundle_id.clone());

    Some(InstalledApp {
        id: bundle_id,
        name,
    })
}

fn resolve_via_sysinfo(pid: i32) -> Option<InstalledApp> {
    let mut sys = System::new();
    let pid = Pid::from_u32(pid as u32);
    sys.refresh_processes(sysinfo::ProcessesToUpdate::Some(&[pid]), true);

    let exe_path = sys.process(pid)?.exe()?;
    find_outermost_app(exe_path)
}

fn find_outermost_app(path: &Path) -> Option<InstalledApp> {
    let mut outermost: Option<&Path> = None;
    let mut current = Some(path);

    while let Some(p) = current {
        if is_app_bundle(p) {
            outermost = Some(p);
        }
        current = p.parent();
    }

    outermost.and_then(read_app_info)
}

fn is_app_bundle(path: &Path) -> bool {
    path.extension().and_then(|s| s.to_str()) == Some("app")
}

fn read_app_info(app_path: &Path) -> Option<InstalledApp> {
    let plist_path = app_path.join("Contents/Info.plist");
    let plist_data = std::fs::read(&plist_path).ok()?;
    let plist: plist::Dictionary = plist::from_bytes(&plist_data).ok()?;

    let bundle_id = plist
        .get("CFBundleIdentifier")
        .and_then(|v| v.as_string())?
        .to_string();

    let name = plist
        .get("CFBundleDisplayName")
        .or_else(|| plist.get("CFBundleName"))
        .and_then(|v| v.as_string())?
        .to_string();

    Some(InstalledApp {
        id: bundle_id,
        name,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    fn test_list_installed_apps() {
        let apps = list_installed_apps();
        println!("Got {} apps", apps.len());
        for app in &apps {
            println!("- {} ({})", app.name, app.id);
        }
    }

    #[test]
    #[ignore]
    fn test_list_mic_using_apps() {
        let apps = list_mic_using_apps();
        println!("Got {} apps", apps.len());
        for app in &apps {
            println!("- {} ({})", app.name, app.id);
        }
    }
}
