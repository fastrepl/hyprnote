use cidre::{core_audio as ca, io};
use objc2_core_graphics::{CGDisplayIsBuiltin, CGGetOnlineDisplayList};

/// Returns `Some(true)` only when we can positively identify a headphone.
/// Returns `None` when uncertain - headphones often misreport as generic speaker/mic.
fn is_headphone_from_device(device: Option<ca::Device>) -> Option<bool> {
    let device = device?;
    let streams = device.streams().ok()?;

    let detected = streams.iter().any(|s| {
        s.terminal_type().ok().is_some_and(|term_type| {
            term_type == ca::StreamTerminalType::HEADPHONES
                || term_type == ca::StreamTerminalType::HEADSET_MIC
                || term_type.0 == io::audio::output_term::HEADPHONES
                || term_type.0 == io::audio::output_term::HEAD_MOUNTED_DISPLAY_AUDIO
        })
    });

    if detected { Some(true) } else { None }
}

pub fn is_headphone_from_default_output_device() -> Option<bool> {
    let device = ca::System::default_output_device().ok();
    is_headphone_from_device(device)
}

pub fn is_headphone_from_default_input_device() -> Option<bool> {
    let device = ca::System::default_input_device().ok();
    is_headphone_from_device(device)
}

fn is_external_from_device(device: Option<ca::Device>) -> bool {
    device
        .and_then(|d| d.transport_type().ok())
        .map(|t| t != ca::DeviceTransportType::BUILT_IN)
        .unwrap_or(false)
}

pub fn is_default_input_external() -> bool {
    let device = ca::System::default_input_device().ok();
    is_external_from_device(device)
}

pub fn is_default_output_external() -> bool {
    let device = ca::System::default_output_device().ok();
    is_external_from_device(device)
}

//  Used `CGGetOnlineDisplayList` instead of `CGGetActiveDisplayList` to handle external display.
pub fn is_builtin_display_inactive() -> bool {
    let mut display_count: u32 = 0;
    let mut displays: [u32; 16] = [0; 16];

    unsafe {
        let result = CGGetOnlineDisplayList(16, displays.as_mut_ptr(), &mut display_count);
        if result.0 != 0 {
            return false;
        }
    }

    for i in 0..display_count as usize {
        if CGDisplayIsBuiltin(displays[i]) {
            return false;
        }
    }

    display_count > 0
}

pub fn is_builtin_display_foldable() -> bool {
    hypr_mac::ModelIdentifier::current()
        .ok()
        .flatten()
        .map(|model| model.has_foldable_display())
        .unwrap_or(false)
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
            "is_headphone_from_default_output_device={:?}",
            is_headphone_from_default_output_device()
        );
        println!(
            "is_headphone_from_default_input_device={:?}",
            is_headphone_from_default_input_device()
        );
        println!("is_default_input_external={}", is_default_input_external());
        println!(
            "is_default_output_external={}",
            is_default_output_external()
        );
        println!(
            "is_builtin_display_inactive={}",
            is_builtin_display_inactive()
        );
        println!(
            "is_builtin_display_foldable={}",
            is_builtin_display_foldable()
        );
        println!("has_builtin_mic={}", has_builtin_mic());
    }
}
