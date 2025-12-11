use cidre::{core_audio as ca, io};

fn is_headphone_from_device(device: Option<ca::Device>) -> bool {
    match device {
        Some(device) => match device.streams() {
            Ok(streams) => streams.iter().any(|s| {
                if let Ok(term_type) = s.terminal_type() {
                    term_type == ca::StreamTerminalType::HEADPHONES
                        || term_type == ca::StreamTerminalType::HEADSET_MIC
                        || term_type.0 == io::audio::output_term::HEADPHONES
                        || term_type.0 == io::audio::output_term::HEAD_MOUNTED_DISPLAY_AUDIO
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

pub fn is_headphone_from_default_input_device() -> bool {
    let device = ca::System::default_input_device().ok();
    is_headphone_from_device(device)
}

fn is_external_from_device(device: Option<ca::Device>) -> bool {
    const DEVICE_TRANSPORT_TYPE: ca::PropAddr = ca::PropAddr {
        selector: ca::PropSelector::DEVICE_TRANSPORT_TYPE,
        scope: ca::PropScope::GLOBAL,
        element: ca::PropElement::MAIN,
    };

    const TRANSPORT_TYPE_BUILT_IN: u32 = ca::DeviceTransportType::BUILT_IN.0;

    match device {
        Some(device) => match device.prop::<u32>(&DEVICE_TRANSPORT_TYPE) {
            Ok(transport_type) => transport_type != TRANSPORT_TYPE_BUILT_IN,
            Err(_) => false,
        },
        None => false,
    }
}

pub fn is_default_input_external() -> bool {
    let device = ca::System::default_input_device().ok();
    is_external_from_device(device)
}

pub fn has_builtin_mic() -> bool {
    hypr_mac::ModelIdentifier::current()
        .ok()
        .flatten()
        .map(|model| model.has_builtin_mic())
        .unwrap_or(false)
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_things() {
        println!(
            "is_headphone_from_default_output_device={}",
            is_headphone_from_default_output_device()
        );
        println!("is_default_input_external={}", is_default_input_external());
    }
}
