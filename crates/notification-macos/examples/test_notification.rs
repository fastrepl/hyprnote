use notification_macos::*;

use std::time::Duration;

use objc2::rc::Retained;
use objc2::runtime::ProtocolObject;
use objc2::{define_class, msg_send, MainThreadOnly};
use objc2_app_kit::{NSApplication, NSApplicationActivationPolicy, NSApplicationDelegate};
use objc2_foundation::{MainThreadMarker, NSObject, NSObjectProtocol};

#[derive(Debug, Default)]
struct AppDelegateIvars {}

define_class! {
    #[unsafe(super = NSObject)]
    #[thread_kind = MainThreadOnly]
    #[name = "AppDelegate"]
    #[ivars = AppDelegateIvars]
    struct AppDelegate;

    unsafe impl NSObjectProtocol for AppDelegate {}
    unsafe impl NSApplicationDelegate for AppDelegate {}
}

impl AppDelegate {
    fn new(mtm: MainThreadMarker) -> Retained<Self> {
        let this = Self::alloc(mtm).set_ivars(AppDelegateIvars::default());
        unsafe { msg_send![super(this), init] }
    }
}

fn main() {
    let mtm = MainThreadMarker::new().unwrap();

    let app = NSApplication::sharedApplication(mtm);
    app.setActivationPolicy(NSApplicationActivationPolicy::Regular);

    let delegate = AppDelegate::new(mtm);
    app.setDelegate(Some(&ProtocolObject::from_ref(&*delegate)));

    std::thread::spawn(|| {
        std::thread::sleep(Duration::from_millis(200));

        let notification = Notification::builder()
            .key("test_notification")
            .title("Test Notification")
            .message("Hover/click should now react")
            .url("https://example.com")
            .timeout(Duration::from_secs(20))
            .build();

        show(&notification);
        std::thread::sleep(Duration::from_secs(5));
        std::process::exit(0);
    });

    app.run();
}
