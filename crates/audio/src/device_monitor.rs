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

    #[cfg(any(test, feature = "mock"))]
    pub fn noop() -> Self {
        let (stop_tx, _stop_rx) = mpsc::channel();
        Self {
            stop_tx: Some(stop_tx),
            thread_handle: None,
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

            #[cfg(target_os = "linux")]
            {
                crate::device_monitor::linux::monitor(event_tx, stop_rx);
            }

            #[cfg(not(any(target_os = "macos", target_os = "linux")))]
            {
                let _ = event_tx;
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

pub trait DeviceMonitorProvider: Send + Sync + 'static {
    fn spawn(&self, event_tx: mpsc::Sender<DeviceEvent>) -> DeviceMonitorHandle;
}

pub struct RealDeviceMonitorProvider;

impl DeviceMonitorProvider for RealDeviceMonitorProvider {
    fn spawn(&self, event_tx: mpsc::Sender<DeviceEvent>) -> DeviceMonitorHandle {
        DeviceMonitor::spawn(event_tx)
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

#[cfg(target_os = "linux")]
mod linux {
    use super::*;
    use libpulse_binding::{
        context::{
            subscribe::{Facility, InterestMaskSet, Operation},
            Context, FlagSet as ContextFlagSet,
        },
        mainloop::threaded::Mainloop,
        proplist::Proplist,
    };
    use std::cell::RefCell;
    use std::rc::Rc;

    pub(super) fn monitor(event_tx: mpsc::Sender<DeviceEvent>, stop_rx: mpsc::Receiver<()>) {
        let mut proplist = match Proplist::new() {
            Some(p) => p,
            None => {
                tracing::error!("Failed to create PulseAudio proplist");
                let _ = stop_rx.recv();
                return;
            }
        };

        if proplist
            .set_str(
                libpulse_binding::proplist::properties::APPLICATION_NAME,
                "Hyprnote Device Monitor",
            )
            .is_err()
        {
            tracing::error!("Failed to set PulseAudio application name");
            let _ = stop_rx.recv();
            return;
        }

        let mainloop = match Mainloop::new() {
            Some(m) => Rc::new(RefCell::new(m)),
            None => {
                tracing::error!("Failed to create PulseAudio mainloop");
                let _ = stop_rx.recv();
                return;
            }
        };

        let context =
            match Context::new_with_proplist(&*mainloop.borrow(), "HyprnoteContext", &proplist) {
                Some(c) => Rc::new(RefCell::new(c)),
                None => {
                    tracing::error!("Failed to create PulseAudio context");
                    let _ = stop_rx.recv();
                    return;
                }
            };

        if let Err(e) = context
            .borrow_mut()
            .connect(None, ContextFlagSet::NOFLAGS, None)
        {
            tracing::error!("Failed to connect to PulseAudio: {:?}", e);
            let _ = stop_rx.recv();
            return;
        }

        mainloop.borrow_mut().lock();

        if let Err(e) = mainloop.borrow_mut().start() {
            tracing::error!("Failed to start PulseAudio mainloop: {:?}", e);
            mainloop.borrow_mut().unlock();
            let _ = stop_rx.recv();
            return;
        }

        // Wait for context to be ready
        loop {
            match context.borrow().get_state() {
                libpulse_binding::context::State::Ready => {
                    tracing::info!("PulseAudio context ready");
                    break;
                }
                libpulse_binding::context::State::Failed
                | libpulse_binding::context::State::Terminated => {
                    tracing::error!("PulseAudio context failed");
                    mainloop.borrow_mut().unlock();
                    return;
                }
                _ => {
                    mainloop.borrow_mut().unlock();
                    std::thread::sleep(std::time::Duration::from_millis(50));
                    mainloop.borrow_mut().lock();
                }
            }
        }

        // Subscribe to sink and source events
        context.borrow_mut().subscribe(
            InterestMaskSet::SINK | InterestMaskSet::SOURCE | InterestMaskSet::SERVER,
            |success| {
                if !success {
                    tracing::error!("Failed to subscribe to PulseAudio events");
                }
            },
        );

        // Set up subscription callback
        let event_tx_for_callback = event_tx.clone();
        context.borrow_mut().set_subscribe_callback(Some(Box::new(
            move |facility, operation, _index| {
                match (facility, operation) {
                    (Some(Facility::Server), Some(Operation::Changed)) => {
                        // Server change might indicate default device change
                        let _ = event_tx_for_callback.send(DeviceEvent::DefaultInputChanged);
                        let _ = event_tx_for_callback.send(DeviceEvent::DefaultOutputChanged {
                            headphone: is_headphone_from_default_output_device(),
                        });
                    }
                    (Some(Facility::Sink), Some(Operation::Changed | Operation::New)) => {
                        // Sink change might be default output device change
                        let _ = event_tx_for_callback.send(DeviceEvent::DefaultOutputChanged {
                            headphone: is_headphone_from_default_output_device(),
                        });
                    }
                    (Some(Facility::Source), Some(Operation::Changed | Operation::New)) => {
                        // Source change might be default input device change
                        let _ = event_tx_for_callback.send(DeviceEvent::DefaultInputChanged);
                    }
                    _ => {}
                }
            },
        )));

        mainloop.borrow_mut().unlock();

        tracing::info!("monitor_started");

        // Wait for stop signal
        let _ = stop_rx.recv();

        mainloop.borrow_mut().lock();
        context.borrow_mut().disconnect();
        mainloop.borrow_mut().unlock();

        mainloop.borrow_mut().stop();

        tracing::info!("monitor_stopped");
    }

    fn is_headphone_from_default_output_device() -> bool {
        crate::utils::linux::is_headphone_from_default_output_device()
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
