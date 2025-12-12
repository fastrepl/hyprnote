use cidre::{core_audio as ca, os};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use crate::{BackgroundTask, DetectEvent, InstalledApp};

pub struct Detector {
    background: BackgroundTask,
}

impl Default for Detector {
    fn default() -> Self {
        Self {
            background: BackgroundTask::default(),
        }
    }
}

const DEVICE_IS_RUNNING_SOMEWHERE: ca::PropAddr = ca::PropAddr {
    selector: ca::PropSelector::DEVICE_IS_RUNNING_SOMEWHERE,
    scope: ca::PropScope::GLOBAL,
    element: ca::PropElement::MAIN,
};

const POLL_INTERVAL: Duration = Duration::from_secs(1);

struct DetectorState {
    last_state: bool,
    last_change: Instant,
    debounce_duration: Duration,
    active_apps: Vec<InstalledApp>,
}

impl DetectorState {
    fn new() -> Self {
        Self {
            last_state: false,
            last_change: Instant::now(),
            debounce_duration: Duration::from_millis(500),
            active_apps: Vec::new(),
        }
    }

    fn should_trigger(&mut self, new_state: bool) -> bool {
        let now = Instant::now();

        if new_state == self.last_state {
            return false;
        }
        if now.duration_since(self.last_change) < self.debounce_duration {
            return false;
        }

        self.last_state = new_state;
        self.last_change = now;
        true
    }
}

fn diff_apps(
    previous: &[InstalledApp],
    current: &[InstalledApp],
) -> (Vec<InstalledApp>, Vec<InstalledApp>) {
    let previous_ids: HashSet<_> = previous.iter().map(|app| &app.id).collect();
    let current_ids: HashSet<_> = current.iter().map(|app| &app.id).collect();

    let started = current
        .iter()
        .filter(|app| !previous_ids.contains(&app.id))
        .cloned()
        .collect();

    let stopped = previous
        .iter()
        .filter(|app| !current_ids.contains(&app.id))
        .cloned()
        .collect();

    (started, stopped)
}

impl crate::Observer for Detector {
    fn start(&mut self, f: crate::DetectCallback) {
        self.background.start(|running, mut rx| async move {
            let (tx, mut notify_rx) = tokio::sync::mpsc::channel(1);

            std::thread::spawn(move || {
                let callback = std::sync::Arc::new(std::sync::Mutex::new(f));
                let current_device = std::sync::Arc::new(std::sync::Mutex::new(None::<ca::Device>));
                let detector_state =
                    std::sync::Arc::new(std::sync::Mutex::new(DetectorState::new()));
                let polling_active = std::sync::Arc::new(AtomicBool::new(false));

                let callback_for_device = callback.clone();
                let current_device_for_device = current_device.clone();
                let detector_state_for_device = detector_state.clone();
                let polling_active_for_device = polling_active.clone();

                let callback_for_polling = callback.clone();
                let detector_state_for_polling = detector_state.clone();
                let polling_active_for_polling = polling_active.clone();

                std::thread::spawn(move || {
                    loop {
                        std::thread::sleep(POLL_INTERVAL);

                        if !polling_active_for_polling.load(Ordering::SeqCst) {
                            continue;
                        }

                        let current_apps = crate::list_mic_using_apps();

                        if let Ok(mut state_guard) = detector_state_for_polling.lock() {
                            let (started, stopped) =
                                diff_apps(&state_guard.active_apps, &current_apps);

                            state_guard.active_apps = current_apps;

                            if !started.is_empty() {
                                if let Ok(guard) = callback_for_polling.lock() {
                                    let event = DetectEvent::MicStarted(started);
                                    tracing::info!(event = ?event, "detected_via_polling");
                                    (*guard)(event);
                                }
                            }

                            if !stopped.is_empty() {
                                if let Ok(guard) = callback_for_polling.lock() {
                                    let event = DetectEvent::MicStopped(stopped);
                                    tracing::info!(event = ?event, "detected_via_polling");
                                    (*guard)(event);
                                }
                            }
                        }
                    }
                });

                extern "C-unwind" fn device_listener(
                    _obj_id: ca::Obj,
                    number_addresses: u32,
                    addresses: *const ca::PropAddr,
                    client_data: *mut (),
                ) -> os::Status {
                    let data = unsafe {
                        &*(client_data
                            as *const (
                                std::sync::Arc<std::sync::Mutex<crate::DetectCallback>>,
                                std::sync::Arc<std::sync::Mutex<Option<ca::Device>>>,
                                std::sync::Arc<std::sync::Mutex<DetectorState>>,
                                std::sync::Arc<AtomicBool>,
                            ))
                    };
                    let callback = &data.0;
                    let state = &data.2;
                    let polling_active = &data.3;

                    let addresses =
                        unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

                    for addr in addresses {
                        if addr.selector == ca::PropSelector::DEVICE_IS_RUNNING_SOMEWHERE {
                            if let Ok(device) = ca::System::default_input_device() {
                                if let Ok(is_running) =
                                    device.prop::<u32>(&DEVICE_IS_RUNNING_SOMEWHERE)
                                {
                                    let mic_in_use = is_running != 0;

                                    if let Ok(mut state_guard) = state.lock() {
                                        if state_guard.should_trigger(mic_in_use) {
                                            if mic_in_use {
                                                let apps = crate::list_mic_using_apps();
                                                tracing::info!(
                                                    "detect_device_listener: {:?}",
                                                    apps
                                                );

                                                state_guard.active_apps = apps.clone();
                                                polling_active.store(true, Ordering::SeqCst);

                                                if let Ok(guard) = callback.lock() {
                                                    let event = DetectEvent::MicStarted(apps);
                                                    tracing::info!(event = ?event, "detected");
                                                    (*guard)(event);
                                                }
                                            } else {
                                                polling_active.store(false, Ordering::SeqCst);

                                                let stopped_apps =
                                                    std::mem::take(&mut state_guard.active_apps);

                                                if let Ok(guard) = callback.lock() {
                                                    let event =
                                                        DetectEvent::MicStopped(stopped_apps);
                                                    tracing::info!(event = ?event, "detected");
                                                    (*guard)(event);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    os::Status::NO_ERR
                }

                extern "C-unwind" fn system_listener(
                    _obj_id: ca::Obj,
                    number_addresses: u32,
                    addresses: *const ca::PropAddr,
                    client_data: *mut (),
                ) -> os::Status {
                    let data = unsafe {
                        &*(client_data
                            as *const (
                                std::sync::Arc<std::sync::Mutex<crate::DetectCallback>>,
                                std::sync::Arc<std::sync::Mutex<Option<ca::Device>>>,
                                std::sync::Arc<std::sync::Mutex<DetectorState>>,
                                std::sync::Arc<AtomicBool>,
                                *mut (),
                            ))
                    };
                    let current_device = &data.1;
                    let state = &data.2;
                    let polling_active = &data.3;
                    let device_listener_data = data.4;

                    let addresses =
                        unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

                    for addr in addresses {
                        if addr.selector == ca::PropSelector::HW_DEFAULT_INPUT_DEVICE {
                            if let Ok(mut device_guard) = current_device.lock() {
                                if let Some(old_device) = device_guard.take() {
                                    let _ = old_device.remove_prop_listener(
                                        &DEVICE_IS_RUNNING_SOMEWHERE,
                                        device_listener,
                                        device_listener_data,
                                    );
                                }

                                if let Ok(new_device) = ca::System::default_input_device() {
                                    let mic_in_use = if let Ok(is_running) =
                                        new_device.prop::<u32>(&DEVICE_IS_RUNNING_SOMEWHERE)
                                    {
                                        is_running != 0
                                    } else {
                                        false
                                    };

                                    if new_device
                                        .add_prop_listener(
                                            &DEVICE_IS_RUNNING_SOMEWHERE,
                                            device_listener,
                                            device_listener_data,
                                        )
                                        .is_ok()
                                    {
                                        *device_guard = Some(new_device);

                                        if let Ok(mut state_guard) = state.lock() {
                                            if state_guard.should_trigger(mic_in_use) {
                                                if mic_in_use {
                                                    let apps = crate::list_mic_using_apps();
                                                    tracing::info!(
                                                        "detect_system_listener: {:?}",
                                                        apps
                                                    );

                                                    state_guard.active_apps = apps.clone();
                                                    polling_active.store(true, Ordering::SeqCst);

                                                    if let Ok(callback_guard) = data.0.lock() {
                                                        (*callback_guard)(DetectEvent::MicStarted(
                                                            apps,
                                                        ));
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    os::Status::NO_ERR
                }

                let device_listener_data = Box::new((
                    callback_for_device.clone(),
                    current_device_for_device.clone(),
                    detector_state_for_device.clone(),
                    polling_active_for_device.clone(),
                ));
                let device_listener_ptr = Box::into_raw(device_listener_data) as *mut ();

                let system_listener_data = Box::new((
                    callback.clone(),
                    current_device.clone(),
                    detector_state.clone(),
                    polling_active.clone(),
                    device_listener_ptr,
                ));
                let system_listener_ptr = Box::into_raw(system_listener_data) as *mut ();

                if let Err(e) = ca::System::OBJ.add_prop_listener(
                    &ca::PropSelector::HW_DEFAULT_INPUT_DEVICE.global_addr(),
                    system_listener,
                    system_listener_ptr,
                ) {
                    tracing::error!("adding_system_listener_failed: {:?}", e);
                } else {
                    tracing::info!("adding_system_listener_success");
                }

                if let Ok(device) = ca::System::default_input_device() {
                    let mic_in_use =
                        if let Ok(is_running) = device.prop::<u32>(&DEVICE_IS_RUNNING_SOMEWHERE) {
                            is_running != 0
                        } else {
                            false
                        };

                    if device
                        .add_prop_listener(
                            &DEVICE_IS_RUNNING_SOMEWHERE,
                            device_listener,
                            device_listener_ptr,
                        )
                        .is_ok()
                    {
                        tracing::info!("adding_device_listener_success");

                        if let Ok(mut device_guard) = current_device.lock() {
                            *device_guard = Some(device);
                        }

                        if let Ok(mut state_guard) = detector_state.lock() {
                            state_guard.last_state = mic_in_use;
                            if mic_in_use {
                                state_guard.active_apps = crate::list_mic_using_apps();
                                polling_active.store(true, Ordering::SeqCst);
                            }
                        }
                    } else {
                        tracing::error!("adding_device_listener_failed");
                    }
                } else {
                    tracing::warn!("no_default_input_device_found");
                }

                let _ = tx.blocking_send(());

                loop {
                    std::thread::park();
                }
            });

            let _ = notify_rx.recv().await;

            loop {
                tokio::select! {
                    _ = &mut rx => {
                        break;
                    }
                    _ = tokio::time::sleep(tokio::time::Duration::from_millis(500)) => {
                        if !running.load(std::sync::atomic::Ordering::SeqCst) {
                            break;
                        }
                    }
                }
            }
        });
    }

    fn stop(&mut self) {
        self.background.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Observer, new_callback};

    #[tokio::test]
    async fn test_detector() {
        let mut detector = Detector::default();
        detector.start(new_callback(|v| {
            println!("{:?}", v);
        }));

        tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        detector.stop();
    }
}
