const COMMANDS: &[&str] = &["event", "set_properties", "set_disabled", "is_disabled"];

fn main() {
    println!("cargo:rerun-if-env-changed=POSTHOG_API_KEY");
    println!("cargo:rerun-if-env-changed=APP_VERSION");

    let app_version = match std::env::var("APP_VERSION") {
        Ok(v) if !v.is_empty() => format!("desktop_v{v}"),
        _ => "desktop_vdev".to_string(),
    };

    println!("cargo:rustc-env=HYPRNOTE_APP_VERSION={}", app_version);

    tauri_plugin::Builder::new(COMMANDS).build();
}
