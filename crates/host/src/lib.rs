use std::hash::{DefaultHasher, Hash, Hasher};
use sysinfo::System;

#[cfg(target_os = "macos")]
use std::os::unix::net::UnixStream;

pub fn cpu_arch() -> String {
    System::cpu_arch()
}

pub fn long_os_version() -> String {
    System::long_os_version().unwrap_or("Unknown".to_string())
}

pub fn fingerprint() -> String {
    let fingerprint = machine_uid::get().unwrap_or_default();

    let mut hasher = DefaultHasher::new();
    fingerprint.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

pub enum ProcessMatcher {
    Name(String),
    Sidecar,
}

pub fn kill_processes_by_matcher(matcher: ProcessMatcher) -> u16 {
    let target = match matcher {
        ProcessMatcher::Name(name) => name,
        ProcessMatcher::Sidecar => "hyprnote-sidecar".to_string(),
    };

    let mut sys = sysinfo::System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let mut killed_count = 0;

    for process in sys.processes().values() {
        let process_name = process.name().to_string_lossy();

        if process_name.contains(&target) && process.kill() {
            killed_count += 1;
        }
    }

    killed_count
}

#[cfg(target_os = "macos")]
pub fn cleanup_stale_single_instance_socket(identifier: &str) -> bool {
    // https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/single-instance/src/platform_impl/macos.rs#L60-L71
    let normalized_identifier = identifier.replace(['.', '-'], "_");
    let socket_path = format!("/tmp/{}_si.sock", normalized_identifier);

    if !std::path::Path::new(&socket_path).exists() {
        return false;
    }

    let is_stale = match UnixStream::connect(&socket_path) {
        Ok(_) => false,
        // https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/single-instance/src/platform_impl/macos.rs#L29-L43
        Err(e) if e.kind() == std::io::ErrorKind::ConnectionRefused => true,
        Err(_) => false,
    };

    is_stale && std::fs::remove_file(&socket_path).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_long_os_version() {
        let a = long_os_version();
        let b = long_os_version();
        let c = long_os_version();
        assert_eq!(a, b);
        assert_eq!(a, c);
    }

    #[test]
    fn test_cpu_arch() {
        let a = cpu_arch();
        let b = cpu_arch();
        let c = cpu_arch();
        assert_eq!(a, b);
        assert_eq!(a, c);
    }

    #[test]
    fn test_fingerprint() {
        let a = fingerprint();
        let b = fingerprint();
        let c = fingerprint();
        assert_eq!(a, b);
        assert_eq!(a, c);
    }

    #[test]
    fn test_kill_processes_by_matcher() {
        let killed_count = kill_processes_by_matcher(ProcessMatcher::Sidecar);
        assert!(killed_count == 0);
    }
}
