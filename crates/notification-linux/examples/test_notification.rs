use notification_linux::*;

fn main() {
    let notification = Notification::builder()
        .title("Test Notification")
        .message("This is a test notification from hyprnote")
        .url("https://example.com")
        .timeout(std::time::Duration::from_secs(5))
        .build();

    show(&notification);

    std::thread::sleep(std::time::Duration::from_secs(10));
}
