#[cfg(target_os = "macos")]
pub mod macos {
    use cidre::{core_audio as ca, io};

    fn is_headphone_from_device(device: Option<ca::Device>) -> bool {
        match device {
            Some(device) => match device.streams() {
                Ok(streams) => streams.iter().any(|s| {
                    if let Ok(term_type) = s.terminal_type() {
                        term_type.0 == io::audio::output_term::HEADPHONES
                            || term_type == ca::StreamTerminalType::HEADPHONES
                    } else {
                        false
                    }
                }),
                Err(_) => false,
            },
            None => false,
        }
    }

    pub fn is_headphone_from_default_output_device() -> bool {
        let device = ca::System::default_output_device().ok();
        is_headphone_from_device(device)
    }
}

#[cfg(target_os = "macos")]
#[cfg(test)]
pub mod test {
    use super::macos::*;

    #[test]
    fn test_is_headphone_from_default_output_device() {
        println!(
            "is_headphone_from_default_output_device={}",
            is_headphone_from_default_output_device()
        );
    }
}
