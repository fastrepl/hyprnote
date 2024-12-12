use swift_rs::{swift, SRString};

swift!(fn _get_device_id() -> SRString);

pub fn get_device_id() -> String {
    let output = unsafe { _get_device_id() };
    output.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_device_id() {
        let device_id = get_device_id();
        assert!(!device_id.is_empty());
    }
}
