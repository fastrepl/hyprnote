#[cfg(target_os = "macos")]
use swift_rs::{swift, Bool, Int, SRString};

#[cfg(target_os = "macos")]
swift!(fn _audio_capture_permission_status() -> Int);

#[cfg(target_os = "macos")]
swift!(fn _reset_audio_capture_permission(bundle_id: SRString) -> Bool);

#[cfg(target_os = "macos")]
swift!(fn _reset_microphone_permission(bundle_id: SRString) -> Bool);

pub const TCC_ERROR: isize = -1;
pub const NEVER_ASKED: isize = 2;
pub const DENIED: isize = 1;
pub const GRANTED: isize = 0;

#[cfg(target_os = "macos")]
pub fn audio_capture_permission_status() -> isize {
    unsafe { _audio_capture_permission_status() }
}

#[cfg(not(target_os = "macos"))]
pub fn audio_capture_permission_status() -> isize {
    NEVER_ASKED
}

#[cfg(target_os = "macos")]
pub fn reset_audio_capture_permission(bundle_id: impl Into<SRString>) -> bool {
    unsafe { _reset_audio_capture_permission(bundle_id.into()) }
}

#[cfg(not(target_os = "macos"))]
pub fn reset_audio_capture_permission(_bundle_id: impl Into<String>) -> bool {
    false
}

#[cfg(target_os = "macos")]
pub fn reset_microphone_permission(bundle_id: impl Into<SRString>) -> bool {
    unsafe { _reset_microphone_permission(bundle_id.into()) }
}

#[cfg(not(target_os = "macos"))]
pub fn reset_microphone_permission(_bundle_id: impl Into<String>) -> bool {
    false
}

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::*;

    #[test]
    fn test_audio_capture_permission_granted() {
        let result = audio_capture_permission_status();
        assert!(result == NEVER_ASKED);
    }

    #[test]
    fn test_reset_audio_capture_permission() {
        let result = reset_audio_capture_permission("com.hyprnote.nightly");
        println!("reset_audio_capture_permission: {}", result);
    }

    #[test]
    fn test_reset_microphone_permission() {
        let result = reset_microphone_permission("com.hyprnote.nightly");
        println!("reset_microphone_permission: {}", result);
    }
}
