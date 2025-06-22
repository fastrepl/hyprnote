#[cfg(target_os = "macos")]
use swift_rs::{swift, Bool};

#[cfg(target_os = "macos")]
swift!(fn _audio_capture_permission_granted() -> Bool);

#[cfg(not(target_os = "macos"))]
pub fn _audio_capture_permission_granted() -> bool {
    // On non-macOS platforms, assume permission is granted
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(target_os = "macos")]
    fn test_audio_capture_permission_granted() {
        let result = unsafe { _audio_capture_permission_granted() };
        assert!(result);
    }

    #[test]
    #[cfg(not(target_os = "macos"))]
    fn test_audio_capture_permission_granted() {
        let result = _audio_capture_permission_granted();
        assert!(result);
    }
}
