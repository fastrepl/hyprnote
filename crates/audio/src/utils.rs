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

        use core_graphics::display::{CGDisplay, CGGetActiveDisplayList};

        let max_displays: u32 = 16;
        let mut display_ids = vec![0u32; max_displays as usize];
        let mut display_count: u32 = 0;

        let err = unsafe {
            CGGetActiveDisplayList(max_displays, display_ids.as_mut_ptr(), &mut display_count)
        };

        if err != 0 {
            tracing::warn!(error = err, "cg_get_active_display_list_failed");
            return false;
        }

        let mut has_builtin = false;
        let mut has_external = false;

        for &display_id in display_ids.iter().take(display_count as usize) {
            let display = CGDisplay::new(display_id);
            if display.is_builtin() {
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
}

#[cfg(target_os = "linux")]
pub mod linux {
    use libpulse_binding as pulse;
    use pulse::context::{Context, FlagSet as ContextFlagSet};
    use pulse::mainloop::threaded::Mainloop;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::{Arc, Mutex};
    use std::time::Duration;

    const CONNECT_TIMEOUT: Duration = Duration::from_millis(2000);
    const QUERY_TIMEOUT: Duration = Duration::from_millis(1000);

    pub fn is_headphone_from_default_output_device() -> bool {
        let mut mainloop = match Mainloop::new() {
            Some(m) => m,
            None => {
                tracing::debug!("failed_to_create_pulseaudio_mainloop");
                return false;
            }
        };

        let mut context = match Context::new(&mainloop, "hyprnote-headphone-check") {
            Some(c) => c,
            None => {
                tracing::debug!("failed_to_create_pulseaudio_context");
                return false;
            }
        };

        if context
            .connect(None, ContextFlagSet::NOFLAGS, None)
            .is_err()
        {
            tracing::debug!("failed_to_connect_to_pulseaudio");
            return false;
        }

        if mainloop.start().is_err() {
            tracing::debug!("failed_to_start_mainloop");
            return false;
        }

        if !wait_for_context(&mut mainloop, &context, CONNECT_TIMEOUT) {
            mainloop.stop();
            return false;
        }

        let result = Arc::new(Mutex::new(false));
        let done = Arc::new(AtomicBool::new(false));

        {
            let result = result.clone();
            let done = done.clone();

            mainloop.lock();
            let introspector = context.introspect();
            introspector.get_sink_info_by_name("@DEFAULT_SINK@", move |list_result| {
                if let pulse::callbacks::ListResult::Item(sink_info) = list_result {
                    if let Some(active_port) = &sink_info.active_port {
                        if let Some(name) = active_port.name.as_ref() {
                            let name_lower = name.to_lowercase();
                            let is_headphone =
                                name_lower.contains("headphone") || name_lower.contains("headset");
                            if let Ok(mut r) = result.lock() {
                                *r = is_headphone;
                            }
                        }
                    }
                }
                done.store(true, Ordering::Release);
            });
            mainloop.unlock();
        }

        wait_for_done(&done, QUERY_TIMEOUT);
        mainloop.stop();

        result.lock().map(|r| *r).unwrap_or(false)
    }

    fn wait_for_context(mainloop: &mut Mainloop, context: &Context, timeout: Duration) -> bool {
        let start = std::time::Instant::now();

        loop {
            if start.elapsed() > timeout {
                tracing::debug!("pulseaudio_connect_timeout");
                return false;
            }

            mainloop.lock();
            let state = context.get_state();
            mainloop.unlock();

            match state {
                pulse::context::State::Ready => return true,
                pulse::context::State::Failed | pulse::context::State::Terminated => {
                    tracing::debug!("pulseaudio_context_connection_failed");
                    return false;
                }
                _ => std::thread::sleep(Duration::from_millis(10)),
            }
        }
    }

    fn wait_for_done(done: &AtomicBool, timeout: Duration) {
        let start = std::time::Instant::now();
        while !done.load(Ordering::Acquire) && start.elapsed() < timeout {
            std::thread::sleep(Duration::from_millis(10));
        }
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

#[cfg(target_os = "linux")]
#[cfg(test)]
mod linux_test {
    use super::linux::*;

    #[test]
    fn test_is_headphone_from_default_output_device() {
        let result = is_headphone_from_default_output_device();
        println!("is_headphone_from_default_output_device={}", result);
    }
}
