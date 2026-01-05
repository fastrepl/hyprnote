const COMMANDS: &[&str] = &[
    "write_json_batch",
    "write_markdown_batch",
    "write_frontmatter_batch",
    "list_folders",
    "move_session",
    "create_folder",
    "rename_folder",
    "delete_folder",
    "cleanup_orphan_files",
    "cleanup_orphan_dirs",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
