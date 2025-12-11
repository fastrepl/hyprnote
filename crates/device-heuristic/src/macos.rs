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

pub fn hw_model() -> std::io::Result<String> {
    use libc::{c_void, size_t};
    use std::ffi::CString;

    unsafe {
        let name = CString::new("hw.model").unwrap();

        let mut len: size_t = 0;
        if libc::sysctlbyname(
            name.as_ptr(),
            std::ptr::null_mut(),
            &mut len,
            std::ptr::null_mut(),
            0,
        ) != 0
        {
            return Err(std::io::Error::last_os_error());
        }

        let mut buf = vec![0u8; len];
        if libc::sysctlbyname(
            name.as_ptr(),
            buf.as_mut_ptr() as *mut c_void,
            &mut len,
            std::ptr::null_mut(),
            0,
        ) != 0
        {
            return Err(std::io::Error::last_os_error());
        }

        if let Some(pos) = buf.iter().position(|&b| b == 0) {
            buf.truncate(pos);
        }

        Ok(String::from_utf8_lossy(&buf).into_owned())
    }
}

pub fn is_macbook() -> bool {
    hw_model()
        .map(|model| model.starts_with("MacBook"))
        .unwrap_or(false)
}

pub fn is_macbook_in_clamshell() -> bool {
    if !is_macbook() {
        return false;
    }

    use objc2_core_graphics::{CGDisplayIsBuiltin, CGGetActiveDisplayList};

    let max_displays: u32 = 16;
    let mut display_ids = vec![0u32; max_displays as usize];
    let mut display_count: u32 = 0;

    let err = unsafe {
        CGGetActiveDisplayList(max_displays, display_ids.as_mut_ptr(), &mut display_count)
    };

    if err.0 != 0 {
        tracing::warn!(error = err.0, "cg_get_active_display_list_failed");
        return false;
    }

    let mut has_builtin = false;
    let mut has_external = false;

    for &display_id in display_ids.iter().take(display_count as usize) {
        if CGDisplayIsBuiltin(display_id) {
            has_builtin = true;
        } else {
            has_external = true;
        }
    }

    !has_builtin && has_external
}

const DEVICE_TRANSPORT_TYPE: ca::PropAddr = ca::PropAddr {
    selector: ca::PropSelector::DEVICE_TRANSPORT_TYPE,
    scope: ca::PropScope::GLOBAL,
    element: ca::PropElement::MAIN,
};

const TRANSPORT_TYPE_BUILT_IN: u32 = 0x626C7469; // 'blti'

pub fn is_default_input_external() -> bool {
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

    #[test]
    fn test_macbook() {
        println!("is_macbook={}", is_macbook());
        println!("is_macbook_in_clamshell={}", is_macbook_in_clamshell());
    }
}
