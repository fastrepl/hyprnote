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

#[cfg(target_os = "linux")]
pub mod linux {
    use libpulse_binding as pulse;
    use pulse::context::{Context, FlagSet as ContextFlagSet};
    use pulse::mainloop::threaded::Mainloop;
    use std::sync::{Arc, Mutex};
    use std::time::Duration;

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

        mainloop.lock();
        loop {
            match context.get_state() {
                pulse::context::State::Ready => break,
                pulse::context::State::Failed | pulse::context::State::Terminated => {
                    mainloop.unlock();
                    tracing::debug!("pulseaudio_context_connection_failed");
                    return false;
                }
                _ => {
                    mainloop.wait();
                }
            }
        }
        mainloop.unlock();

        let result = Arc::new(Mutex::new(false));
        let result_clone = result.clone();
        let done = Arc::new(Mutex::new(false));
        let done_clone = done.clone();

        let introspector = context.introspect();
        introspector.get_sink_info_by_name(
            "@DEFAULT_SINK@",
            move |list_result| match list_result {
                pulse::callbacks::ListResult::Item(sink_info) => {
                    if let Some(active_port) = &sink_info.active_port {
                        let port_name = active_port.name.as_ref().map(|s| s.to_lowercase());
                        if let Some(name) = port_name {
                            let is_headphone = name.contains("headphone")
                                || name.contains("headset")
                                || name == "analog-output-headphones";
                            if let Ok(mut r) = result_clone.lock() {
                                *r = is_headphone;
                            }
                        }
                    }
                    if let Ok(mut d) = done_clone.lock() {
                        *d = true;
                    }
                }
                pulse::callbacks::ListResult::End => {
                    if let Ok(mut d) = done_clone.lock() {
                        *d = true;
                    }
                }
                pulse::callbacks::ListResult::Error => {
                    if let Ok(mut d) = done_clone.lock() {
                        *d = true;
                    }
                }
            },
        );

        for _ in 0..100 {
            if let Ok(d) = done.lock() {
                if *d {
                    break;
                }
            }
            std::thread::sleep(Duration::from_millis(10));
        }

        mainloop.stop();

        result.lock().map(|r| *r).unwrap_or(false)
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
