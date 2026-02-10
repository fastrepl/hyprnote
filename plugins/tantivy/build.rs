const COMMANDS: &[&str] = &[
    "search",
    "reindex",
    "add_document",
    "update_document",
    "remove_document",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
