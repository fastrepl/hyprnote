use notification_macos::*;
use std::time::Duration;

#[cfg(target_os = "macos")]
#[link(name = "AppKit", kind = "framework")]
#[link(name = "Foundation", kind = "framework")]
extern "C" {
    fn NSApplicationLoad() -> bool;
    fn CFRunLoopRun();
    fn CFRunLoopStop(rl: *const std::ffi::c_void);
    fn CFRunLoopGetMain() -> *const std::ffi::c_void;
}

fn main() {
    #[cfg(target_os = "macos")]
    {
        unsafe {
            NSApplicationLoad();
        }

        std::thread::spawn(|| {
            std::thread::sleep(Duration::from_millis(100));

            let notification = Notification {
                title: "Test Notification".to_string(),
                message: "This is a test message from Rust".to_string(),
                url: Some("https://example.com".to_string()),
                timeout: Some(Duration::from_secs(3)),
            };

            show(&notification);

            std::thread::sleep(Duration::from_secs(5));
            unsafe {
                let main_loop = CFRunLoopGetMain();
                CFRunLoopStop(main_loop);
            }
        });

        unsafe {
            CFRunLoopRun();
        }
    }
}
