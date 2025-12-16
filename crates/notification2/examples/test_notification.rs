use std::time::Duration;

use gpui::{App, Application};
use notification2::Notification;

fn main() {
    Application::new().run(|cx: &mut App| {
        let notification = Notification::builder()
            .title("Test Notification")
            .message("This notification will auto-dismiss in 5 seconds")
            .url("https://example.com")
            .timeout(Duration::from_secs(5))
            .build();

        notification2::show(&notification, cx);
    });
}
