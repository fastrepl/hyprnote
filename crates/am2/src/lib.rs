use swift_rs::swift;

swift!(fn initialize_am2_sdk());

swift!(fn check_am2_ready() -> bool);

pub fn init() {
    unsafe {
        initialize_am2_sdk();
    }
}

pub fn is_ready() -> bool {
    unsafe { check_am2_ready() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_am2_swift_compilation() {
        init();
        assert!(is_ready());
    }
}
