use swift_rs::{swift, Bool};

swift!(fn _audio_capture_permission_granted() -> Bool);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_capture_permission_granted() {
        let result = unsafe { _audio_capture_permission_granted() };
        assert!(result);
    }
}
