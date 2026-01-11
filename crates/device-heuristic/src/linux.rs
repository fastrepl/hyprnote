use libpulse_binding as pulse;
use pulse::context::{Context, FlagSet as ContextFlagSet};
use pulse::mainloop::threaded::Mainloop;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

const CONNECT_TIMEOUT: Duration = Duration::from_millis(2000);
const QUERY_TIMEOUT: Duration = Duration::from_millis(1000);

pub fn is_headphone_from_default_output_device() -> Option<bool> {
    let mut mainloop = Mainloop::new()?;

    let mut context = Context::new(&mainloop, "hyprnote-headphone-check")?;

    if context
        .connect(None, ContextFlagSet::NOFLAGS, None)
        .is_err()
    {
        tracing::debug!("failed_to_connect_to_pulseaudio");
        return None;
    }

    if mainloop.start().is_err() {
        tracing::debug!("failed_to_start_mainloop");
        return None;
    }

    if !wait_for_context(&mut mainloop, &context, CONNECT_TIMEOUT) {
        mainloop.stop();
        return None;
    }

    let result = Arc::new(Mutex::new(None));
    let done = Arc::new(AtomicBool::new(false));

    {
        let result = result.clone();
        let done = done.clone();

        mainloop.lock();
        let introspector = context.introspect();
        introspector.get_sink_info_by_name("@DEFAULT_SINK@", move |list_result| {
            if let pulse::callbacks::ListResult::Item(sink_info) = list_result
                && let Some(active_port) = &sink_info.active_port
                && let Some(name) = active_port.name.as_ref()
            {
                let name_lower = name.to_lowercase();
                let is_headphone =
                    name_lower.contains("headphone") || name_lower.contains("headset");
                if let Ok(mut r) = result.lock() {
                    *r = if is_headphone { Some(true) } else { None };
                }
            }
            done.store(true, Ordering::Release);
        });
        mainloop.unlock();
    }

    wait_for_done(&done, QUERY_TIMEOUT);
    mainloop.stop();

    result.lock().ok().and_then(|r| *r)
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

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_is_headphone_from_default_output_device() {
        let result = is_headphone_from_default_output_device();
        println!("is_headphone_from_default_output_device={:?}", result);
    }
}
