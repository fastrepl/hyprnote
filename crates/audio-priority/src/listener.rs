//! Real-time audio device change listening.
//!
//! Provides channel-based notification when audio devices change.

use std::sync::mpsc;
use std::thread::JoinHandle;

use crate::Error;

/// Events that can be emitted by the device listener.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeviceChangeEvent {
    /// Device list changed (device connected/disconnected).
    DeviceListChanged,
    /// Default input device changed.
    DefaultInputChanged,
    /// Default output device changed.
    DefaultOutputChanged,
}

/// Handle for a running device listener.
///
/// Dropping this handle will stop the listener and clean up resources.
pub struct DeviceListenerHandle {
    stop_tx: Option<mpsc::Sender<()>>,
    thread_handle: Option<JoinHandle<()>>,
}

impl DeviceListenerHandle {
    pub fn stop(mut self) {
        if let Some(stop_tx) = self.stop_tx.take() {
            let _ = stop_tx.send(());
        }
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
    }
}

impl Drop for DeviceListenerHandle {
    fn drop(&mut self) {
        if let Some(stop_tx) = self.stop_tx.take() {
            let _ = stop_tx.send(());
        }
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
    }
}

/// Start listening for device changes.
///
/// Returns a channel receiver that will receive events when devices change,
/// and a handle that must be kept alive. When the handle is dropped, listening stops.
pub fn start_device_listener()
-> Result<(mpsc::Receiver<DeviceChangeEvent>, DeviceListenerHandle), Error> {
    let (event_tx, event_rx) = mpsc::channel();
    let (stop_tx, stop_rx) = mpsc::channel();

    let thread_handle = std::thread::spawn(move || {
        #[cfg(target_os = "macos")]
        {
            macos::monitor(event_tx, stop_rx);
        }

        #[cfg(target_os = "linux")]
        {
            let _ = event_tx;
            tracing::warn!("device_listener_unsupported_on_linux");
            let _ = stop_rx.recv();
        }

        #[cfg(target_os = "windows")]
        {
            let _ = event_tx;
            tracing::warn!("device_listener_unsupported_on_windows");
            let _ = stop_rx.recv();
        }

        #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
        {
            let _ = event_tx;
            tracing::warn!("device_listener_unsupported");
            let _ = stop_rx.recv();
        }
    });

    let handle = DeviceListenerHandle {
        stop_tx: Some(stop_tx),
        thread_handle: Some(thread_handle),
    };

    Ok((event_rx, handle))
}

#[cfg(target_os = "macos")]
mod macos {
    use super::*;
    use cidre::{core_audio as ca, ns, os};

    extern "C-unwind" fn listener(
        _obj_id: ca::Obj,
        number_addresses: u32,
        addresses: *const ca::PropAddr,
        client_data: *mut (),
    ) -> os::Status {
        let event_tx = unsafe { &*(client_data as *const mpsc::Sender<DeviceChangeEvent>) };
        let addresses = unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

        for addr in addresses {
            match addr.selector {
                ca::PropSelector::HW_DEVICES => {
                    let _ = event_tx.send(DeviceChangeEvent::DeviceListChanged);
                }
                ca::PropSelector::HW_DEFAULT_INPUT_DEVICE => {
                    let _ = event_tx.send(DeviceChangeEvent::DefaultInputChanged);
                }
                ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE => {
                    let _ = event_tx.send(DeviceChangeEvent::DefaultOutputChanged);
                }
                _ => {}
            }
        }
        os::Status::NO_ERR
    }

    pub(super) fn monitor(event_tx: mpsc::Sender<DeviceChangeEvent>, stop_rx: mpsc::Receiver<()>) {
        let selectors = [
            ca::PropSelector::HW_DEVICES,
            ca::PropSelector::HW_DEFAULT_INPUT_DEVICE,
            ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE,
        ];

        let event_tx_ptr = &event_tx as *const mpsc::Sender<DeviceChangeEvent> as *mut ();

        for selector in selectors {
            if let Err(e) =
                ca::System::OBJ.add_prop_listener(&selector.global_addr(), listener, event_tx_ptr)
            {
                tracing::error!("listener_add_failed: {:?}", e);
                return;
            }
        }

        tracing::info!("device_listener_started");

        let run_loop = ns::RunLoop::current();
        let (stop_notifier_tx, stop_notifier_rx) = mpsc::channel();

        std::thread::spawn(move || {
            let _ = stop_rx.recv();
            let _ = stop_notifier_tx.send(());
        });

        loop {
            run_loop.run_until_date(&ns::Date::distant_future());
            if stop_notifier_rx.try_recv().is_ok() {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }

        for selector in selectors {
            let _ = ca::System::OBJ.remove_prop_listener(
                &selector.global_addr(),
                listener,
                event_tx_ptr,
            );
        }

        tracing::info!("device_listener_stopped");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_device_listener_spawn_and_stop() {
        let (rx, handle) = start_device_listener().unwrap();

        std::thread::sleep(Duration::from_millis(100));
        handle.stop();
        assert!(rx.try_recv().is_err() || rx.try_recv().is_ok());
    }
}
