const COMMANDS: &[&str] = &[
    "deserialize",
    "write_json_batch",
    "write_markdown_batch",
    "write_frontmatter_batch",
    "read_frontmatter_batch",
    "list_folders",
    "move_session",
    "create_folder",
    "rename_folder",
    "delete_folder",
    "cleanup_orphan_files",
    "cleanup_orphan_dirs",
    "audio_exist",
    "audio_delete",
    "audio_import",
    "audio_path",
    "session_dir",
    "delete_session_folder",
    "scan_and_read",
    "chat_dir",
    "entity_dir",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
