const COMMANDS: &[&str] = &["install_cli", "uninstall_cli", "check_cli_status"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
