use gtk::glib;
use gtk::prelude::*;
use notification_linux::*;

fn main() {
    // Initialize GTK
    gtk::init().expect("Failed to initialize GTK");

    let notification = Notification::builder()
        .title("Test Notification")
        .message("This is a test notification from hyprnote")
        .url("https://example.com")
        .timeout(std::time::Duration::from_secs(5))
        .build();

    // Queue the notification on the default main context
    show(&notification);

    // Quit the GTK main loop after 10 seconds so the example exits
    glib::timeout_add_seconds_local_once(10, || {
        gtk::main_quit();
    });

    // Drive the GTK / GLib event loop so the queued closure runs
    gtk::main();
}
