use cidre::{core_audio as ca, io};

fn is_headphone_from_device(device: Option<ca::Device>) -> bool {
    match device {
        Some(device) => match device.streams() {
            Ok(streams) => streams.iter().any(|s| {
                if let Ok(term_type) = s.terminal_type() {
                    term_type == ca::StreamTerminalType::HEADPHONES
                        || term_type.0 == io::audio::output_term::HEADPHONES
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

pub fn is_default_input_external() -> bool {
    const DEVICE_TRANSPORT_TYPE: ca::PropAddr = ca::PropAddr {
        selector: ca::PropSelector::DEVICE_TRANSPORT_TYPE,
        scope: ca::PropScope::GLOBAL,
        element: ca::PropElement::MAIN,
    };

    const TRANSPORT_TYPE_BUILT_IN: u32 = ca::DeviceTransportType::BUILT_IN.0;

    let device = match ca::System::default_input_device() {
        Ok(device) => device,
        Err(_) => return false,
    };

    match device.prop::<u32>(&DEVICE_TRANSPORT_TYPE) {
        Ok(transport_type) => transport_type != TRANSPORT_TYPE_BUILT_IN,
        Err(_) => false,
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_is_headphone_from_default_output_device() {
        println!(
            "is_headphone_from_default_output_device={}",
            is_headphone_from_default_output_device()
        );
    }
}
