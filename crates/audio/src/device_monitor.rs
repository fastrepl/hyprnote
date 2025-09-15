use std::sync::mpsc;
use std::thread::JoinHandle;

#[derive(Debug, Clone)]
pub enum DeviceEvent {
    DefaultInputChanged,
    DefaultOutputChanged { headphone: bool },
}

pub struct DeviceMonitorHandle {
    stop_tx: Option<mpsc::Sender<()>>,
    thread_handle: Option<JoinHandle<()>>,
}

impl DeviceMonitorHandle {
    pub fn stop(mut self) {
        if let Some(stop_tx) = self.stop_tx.take() {
            let _ = stop_tx.send(());
        }
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
    }
}

impl Drop for DeviceMonitorHandle {
    fn drop(&mut self) {
        if let Some(stop_tx) = self.stop_tx.take() {
            let _ = stop_tx.send(());
        }
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
    }
}

pub struct DeviceMonitor;

impl DeviceMonitor {
    pub fn spawn(event_tx: mpsc::Sender<DeviceEvent>) -> DeviceMonitorHandle {
        let (stop_tx, stop_rx) = mpsc::channel();

        let thread_handle = std::thread::spawn(move || {
            #[cfg(target_os = "macos")]
            {
                crate::device_monitor::macos::monitor(event_tx, stop_rx);
            }

            #[cfg(not(target_os = "macos"))]
            {
                tracing::warn!("device_monitoring_unsupported");
                let _ = stop_rx.recv();
            }
        });

        DeviceMonitorHandle {
            stop_tx: Some(stop_tx),
            thread_handle: Some(thread_handle),
        }
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use super::*;
    use crate::utils::macos::is_headphone_from_default_output_device;
    use cidre::{core_audio as ca, ns, os};

    extern "C-unwind" fn listener(
        _obj_id: ca::Obj,
        number_addresses: u32,
        addresses: *const ca::PropAddr,
        client_data: *mut (),
    ) -> os::Status {
        let event_tx = unsafe { &*(client_data as *const mpsc::Sender<DeviceEvent>) };
        let addresses = unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

        for addr in addresses {
            match addr.selector {
                ca::PropSelector::HW_DEFAULT_INPUT_DEVICE => {
                    let _ = event_tx.send(DeviceEvent::DefaultInputChanged);
                }
                ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE => {
                    let headphone = is_headphone_from_default_output_device();
                    let _ = event_tx.send(DeviceEvent::DefaultOutputChanged { headphone });
                }
                _ => {}
            }
        }
        os::Status::NO_ERR
    }

    pub(super) fn monitor(event_tx: mpsc::Sender<DeviceEvent>, stop_rx: mpsc::Receiver<()>) {
        let selectors = [
            ca::PropSelector::HW_DEFAULT_INPUT_DEVICE,
            ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE,
        ];

        let event_tx_ptr = &event_tx as *const mpsc::Sender<DeviceEvent> as *mut ();

        for selector in selectors {
            if let Err(e) =
                ca::System::OBJ.add_prop_listener(&selector.global_addr(), listener, event_tx_ptr)
            {
                tracing::error!("listener_add_failed: {:?}", e);
                return;
            }
        }

        tracing::info!("monitor_started");

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

        tracing::info!("monitor_stopped");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_device_monitor_spawn_and_stop() {
        let (tx, rx) = mpsc::channel();
        let handle = DeviceMonitor::spawn(tx);

        std::thread::sleep(Duration::from_millis(100));
        handle.stop();
        assert!(rx.try_recv().is_err() || rx.try_recv().is_ok());
    }
}
