const COMMANDS: &[&str] = &[
    "list_folders",
    "move_session",
    "create_folder",
    "rename_folder",
    "delete_folder",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
