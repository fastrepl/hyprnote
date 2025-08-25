pub fn kill_processes_by_name(pattern: &str) -> u16 {
    let mut sys = sysinfo::System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let mut killed_count = 0;

    for (_, process) in sys.processes() {
        let process_name = process.name().to_string_lossy();

        if process_name.contains(pattern) {
            println!("Killing process: {}", process_name);
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
    fn test_kill_processes_by_name() {
        let killed_count = kill_processes_by_name("stt-aarch64-apple-darwin");
        assert!(killed_count > 0);
    }
}
