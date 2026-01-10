mod common;

use notification_macos::*;

use std::ops::Add;
use std::time::Duration;

fn main() {
    common::run_app(|| {
        std::thread::sleep(Duration::from_millis(200));
        let timeout = Duration::from_secs(5);

        let notification = Notification::builder()
            .key("test_notification")
            .title("Test Notification")
            .message("No event handlers attached")
            .timeout(timeout)
            .build();

        show(&notification);
        std::thread::sleep(timeout.add(Duration::from_secs(5)));
        std::process::exit(0);
    });
}
