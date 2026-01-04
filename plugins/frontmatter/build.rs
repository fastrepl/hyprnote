const COMMANDS: &[&str] = &["serialize", "deserialize", "serialize_batch"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
