mod common;

use notification_macos::*;
use std::time::Duration;

fn main() {
    common::run_app(|| {
        std::thread::sleep(Duration::from_millis(200));

        setup_notification_accept_handler(|id| {
            println!("accept: {}", id);
        });
        setup_notification_confirm_handler(|id| {
            println!("confirm: {}", id);
        });
        setup_notification_dismiss_handler(|id| {
            println!("dismiss: {}", id);
        });
        setup_notification_timeout_handler(|id| {
            println!("timeout: {}", id);
        });

        let notification = Notification::builder()
            .key("test_notification")
            .title("Test Notification")
            .message("Hover/click should now react")
            .timeout(Duration::from_secs(30))
            .build();

        show(&notification);
        std::thread::sleep(Duration::from_secs(30));
        std::process::exit(0);
    });
}
