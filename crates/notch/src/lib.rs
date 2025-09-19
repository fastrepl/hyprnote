#[cfg(target_os = "macos")]
use swift_rs::{swift, Bool};

#[cfg(target_os = "macos")]
swift!(fn _show_notch() -> Bool);

#[cfg(target_os = "macos")]
pub fn show_notch() -> bool {
    unsafe { _show_notch() }
}
