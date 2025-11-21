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

pub fn audio_capture_permission_status() -> isize {
    #[cfg(target_os = "macos")]
    unsafe {
        _audio_capture_permission_status()
    }

    #[cfg(not(target_os = "macos"))]
    2
}

#[cfg(target_os = "macos")]
pub fn reset_audio_capture_permission(bundle_id: impl Into<SRString>) -> bool {
    unsafe { _reset_audio_capture_permission(bundle_id.into()) }
}

#[cfg(not(target_os = "macos"))]
pub fn reset_audio_capture_permission(bundle_id: impl Into<String>) -> bool {
    true
}

#[cfg(target_os = "macos")]
pub fn reset_microphone_permission(bundle_id: impl Into<SRString>) -> bool {
    unsafe { _reset_microphone_permission(bundle_id.into()) }
}

#[cfg(not(target_os = "macos"))]
pub fn reset_microphone_permission(bundle_id: impl Into<String>) -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_capture_permission_granted() {
        #[cfg(target_os = "macos")]
        let result = audio_capture_permission_status();

        #[cfg(not(target_os = "macos"))]
        let result = audio_capture_permission_status();

        assert!(result == NEVER_ASKED);
    }

    #[test]
    fn test_reset_audio_capture_permission() {
        #[cfg(target_os = "macos")]
        {
            let result = reset_audio_capture_permission("com.hyprnote.nightly");
            println!("reset_audio_capture_permission: {}", result);
        }
    }

    #[test]
    fn test_reset_microphone_permission() {
        #[cfg(target_os = "macos")]
        {
            let result = reset_microphone_permission("com.hyprnote.nightly");
            println!("reset_microphone_permission: {}", result);
        }
    }
}
