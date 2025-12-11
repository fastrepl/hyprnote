const COMMANDS: &[&str] = &["event", "set_properties", "set_disabled", "is_disabled"];

fn main() {
    println!("cargo:rerun-if-env-changed=POSTHOG_API_KEY");

    let gitcl = vergen_gix::GixBuilder::default()
        .describe(true, true, Some("desktop_v*"))
        .build()
        .unwrap();
    vergen_gix::Emitter::default()
        .add_instructions(&gitcl)
        .unwrap()
        .emit()
        .unwrap();

    tauri_plugin::Builder::new(COMMANDS).build();
}
