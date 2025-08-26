#[cfg(target_os = "macos")]
use swift_rs::{swift, Bool};

#[cfg(target_os = "macos")]
swift!(fn _show() -> Bool);

#[cfg(target_os = "macos")]
pub fn show() {
    unsafe {
        _show();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nspanel() {
        println!("show1");
        show();
        println!("show2");
        std::thread::sleep(std::time::Duration::from_secs(10));
    }
}
