const COMMANDS: &[&str] = &["render", "render_custom"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
