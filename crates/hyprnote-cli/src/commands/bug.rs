pub fn run() -> i32 {
    let version = env!("CARGO_PKG_VERSION");
    let url = format!("https://github.com/fastrepl/hyprnote/issues/new?labels=bug,v{version}");

    match open::that(&url) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("Failed to open URL: {e}");
            1
        }
    }
}
