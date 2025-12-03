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
