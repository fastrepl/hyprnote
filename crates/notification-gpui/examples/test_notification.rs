use std::time::Duration;

use gpui::{App, Application};
use notification_gpui::Notification;

fn main() {
    Application::new().run(|cx: &mut App| {
        let notification = Notification::builder()
            .title("Test Notification")
            .message("This notification will auto-dismiss in 5 seconds")
            .timeout(Duration::from_secs(5))
            .build();

        notification_gpui::show(&notification, cx);
    });
}
