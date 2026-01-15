pub fn run() -> i32 {
    match open::that("https://hyprnote.com") {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("Failed to open URL: {e}");
            1
        }
    }
}
