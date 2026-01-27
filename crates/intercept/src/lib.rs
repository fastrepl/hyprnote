use std::sync::atomic::{AtomicBool, Ordering};

#[cfg(target_os = "macos")]
use swift_rs::swift;

#[cfg(target_os = "macos")]
swift!(fn _setup_force_quit_handler());

#[cfg(target_os = "macos")]
static HANDLER_INITIALIZED: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "macos")]
static FORCE_QUIT: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "macos")]
pub fn setup_force_quit_handler() {
    if !HANDLER_INITIALIZED.swap(true, Ordering::SeqCst) {
        unsafe {
            _setup_force_quit_handler();
        }
    }
}

#[cfg(target_os = "macos")]
pub fn should_force_quit() -> bool {
    FORCE_QUIT.load(Ordering::SeqCst)
}

#[unsafe(no_mangle)]
#[cfg(target_os = "macos")]
pub extern "C" fn rust_set_force_quit() {
    FORCE_QUIT.store(true, Ordering::SeqCst);
}
