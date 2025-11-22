#[cfg(target_os = "macos")]
use swift_rs::swift;

#[cfg(target_os = "macos")]
swift!(fn initialize_am2_sdk());

#[cfg(target_os = "macos")]
swift!(fn check_am2_ready() -> bool);

#[cfg(target_os = "macos")]
pub fn init() {
    unsafe {
        initialize_am2_sdk();
    }
}

#[cfg(not(target_os = "macos"))]
pub fn init() {
}

#[cfg(target_os = "macos")]
pub fn is_ready() -> bool {
    unsafe { check_am2_ready() }
}

#[cfg(not(target_os = "macos"))]
pub fn is_ready() -> bool {
    false
}

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::*;

    #[test]
    fn test_am2_swift_compilation() {
        init();
        assert!(is_ready());
    }
}
