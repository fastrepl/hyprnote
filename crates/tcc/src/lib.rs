#[cfg(target_os = "macos")]
use swift_rs::{swift, Bool};

#[cfg(target_os = "macos")]
swift!(fn _audio_capture_permission_granted() -> Bool);

#[cfg(not(target_os = "macos"))]
pub fn _audio_capture_permission_granted() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_capture_permission_granted() {
        #[cfg(target_os = "macos")]
        let result = unsafe { _audio_capture_permission_granted() };

        #[cfg(not(target_os = "macos"))]
        let result = _audio_capture_permission_granted();

        assert!(result);
    }
}
