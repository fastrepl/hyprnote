use swift_rs::{swift, Int};

swift!(fn _todo() -> Int);

pub struct AppleCalendar {}

pub fn todo() -> Int {
    unsafe { _todo() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_todo() {
        assert_eq!(todo(), 1);
    }
}
