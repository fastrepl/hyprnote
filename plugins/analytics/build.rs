const COMMANDS: &[&str] = &["event", "set_properties", "set_disabled", "is_disabled"];

fn main() {
    let gitcl = vergen_gix::GixBuilder::all_git().unwrap();
    vergen_gix::Emitter::default()
        .add_instructions(&gitcl)
        .unwrap()
        .emit()
        .unwrap();

    tauri_plugin::Builder::new(COMMANDS).build();
}
