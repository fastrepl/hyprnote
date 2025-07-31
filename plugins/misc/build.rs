const COMMANDS: &[&str] = &[
    "get_git_hash",
    "get_fingerprint",
    "opinionated_md_to_html",
    "delete_session_folder",
    "parse_meeting_link",
    "audio_open",
    "audio_exist",
    "audio_delete",
];

fn main() {
    let gitcl = vergen_gix::GixBuilder::all_git().unwrap();
    vergen_gix::Emitter::default()
        .add_instructions(&gitcl)
        .unwrap()
        .emit()
        .unwrap();

    tauri_plugin::Builder::new(COMMANDS).build();
}
