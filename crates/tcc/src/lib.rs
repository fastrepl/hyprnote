#[cfg(target_os = "macos")]
use swift_rs::{swift, Bool};

#[cfg(target_os = "macos")]
swift!(fn _macos_audio_capture_permission() -> Bool);

/// Check if audio capture permission is granted
pub fn audio_capture_permission_granted() -> bool {
    #[cfg(target_os = "macos")]
    {
        // SAFETY: The Swift function is a simple permission check that doesn't
        // perform any memory operations that could cause undefined behavior
        unsafe { _macos_audio_capture_permission() as bool }
    }

    #[cfg(not(target_os = "macos"))]
    {
        // On non-macOS platforms, assume permission is granted
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_capture_permission_granted() {
        // This test doesn't actually verify the permission state since
        // that would require system interaction. It just ensures the
        // function can be called without panicking.
        let _result = audio_capture_permission_granted();
    }
}
