use mac_address2::get_mac_address;
use std::hash::{DefaultHasher, Hash, Hasher};
use sysinfo::System;

pub fn cpu_arch() -> String {
    System::cpu_arch()
}

pub fn long_os_version() -> String {
    System::long_os_version().unwrap_or("Unknown".to_string())
}

pub fn fingerprint() -> String {
    let mac_address = get_mac_address()
        .ok()
        .flatten()
        .map(|addr| addr.to_string())
        .unwrap_or_default();

    let sys_name = System::name().unwrap_or_default();
    let sys_host_name = System::host_name().unwrap_or_default();
    let sys_cpu_arch = System::cpu_arch();

    let fingerprint = format!(
        "{}-{}-{}-{}",
        sys_cpu_arch, sys_name, sys_host_name, mac_address
    );

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
        ProcessMatcher::Sidecar => "stt-aarch64-apple-darwin".to_string(),
    };

    let mut sys = sysinfo::System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let mut killed_count = 0;

    for (_, process) in sys.processes() {
        let process_name = process.name().to_string_lossy();

        if process_name.contains(&target) {
            if process.kill() {
                killed_count += 1;
            }
        }
    }

    killed_count
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
        assert!(killed_count > 0);
    }
}
