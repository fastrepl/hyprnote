mod common;

use intercept::*;

fn main() {
    common::run_app(|| {
        std::thread::sleep(std::time::Duration::from_millis(200));
        show_quit_overlay();

        std::thread::sleep(std::time::Duration::from_secs(10));
        std::process::exit(0);
    });
}
