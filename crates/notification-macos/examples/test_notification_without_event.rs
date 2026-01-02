mod common;

use notification_macos::*;
use std::time::Duration;

fn main() {
    common::run_app(|| {
        std::thread::sleep(Duration::from_millis(200));

        let notification = Notification::builder()
            .key("test_notification")
            .title("Test Notification")
            .message("No event handlers attached")
            .timeout(Duration::from_secs(30))
            .build();

        show(&notification);
        std::thread::sleep(Duration::from_secs(30));
        std::process::exit(0);
    });
}
