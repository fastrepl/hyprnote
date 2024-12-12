use swift_rs::{swift, Int};

swift!(fn square_number(number: Int) -> Int);

fn square_number_safe(input: isize) -> isize {
    let output = unsafe { square_number(input) };
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_square_number_safe() {
        assert_eq!(square_number_safe(2), 4);
        assert_eq!(square_number_safe(0), 0);
        assert_eq!(square_number_safe(-3), 9);
        assert_eq!(square_number_safe(5), 25);
    }
}

