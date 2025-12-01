use std::hash::{DefaultHasher, Hash, Hasher};
use sysinfo::System;

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

pub fn has_processes_matching(matcher: &ProcessMatcher) -> bool {
    let target = match matcher {
        ProcessMatcher::Name(name) => name.clone(),
        ProcessMatcher::Sidecar => "stt".to_string(),
    };

    let mut sys = sysinfo::System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    for (_, process) in sys.processes() {
        let process_name = process.name().to_string_lossy();
        if process_name.contains(&target) {
            return true;
        }
    }

    false
}

pub async fn wait_for_processes_to_terminate(
    matcher: ProcessMatcher,
    max_wait_ms: u64,
    check_interval_ms: u64,
) -> bool {
    if check_interval_ms == 0 {
        return false;
    }

    let max_iterations = max_wait_ms / check_interval_ms;

    for _ in 0..max_iterations {
        if !has_processes_matching(&matcher) {
            return true;
        }
        tokio::time::sleep(std::time::Duration::from_millis(check_interval_ms)).await;
    }

    !has_processes_matching(&matcher)
}

pub fn kill_processes_by_matcher(matcher: ProcessMatcher) -> u16 {
    let target = match matcher {
        ProcessMatcher::Name(name) => name,
        ProcessMatcher::Sidecar => "stt".to_string(),
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
