use cidre::{core_audio as ca, os};

use crate::BackgroundTask;

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

impl crate::Observer for Detector {
    fn start(&mut self, f: crate::DetectCallback) {
        self.background.start(|running, mut rx| async move {
            let (tx, mut notify_rx) = tokio::sync::mpsc::channel(1);

            std::thread::spawn(move || {
                let callback = std::sync::Arc::new(std::sync::Mutex::new(f));
                let current_device = std::sync::Arc::new(std::sync::Mutex::new(None::<ca::Device>));

                let callback_for_device = callback.clone();
                let current_device_for_device = current_device.clone();

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
                            ))
                    };
                    let callback = &data.0;

                    let addresses =
                        unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

                    for addr in addresses {
                        if addr.selector == ca::PropSelector::DEVICE_IS_RUNNING_SOMEWHERE {
                            if let Ok(device) = ca::System::default_input_device() {
                                if let Ok(is_running) =
                                    device.prop::<u32>(&DEVICE_IS_RUNNING_SOMEWHERE)
                                {
                                    if is_running != 0 {
                                        if let Ok(guard) = callback.lock() {
                                            (*guard)("microphone_in_use".to_string());
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
                                *mut (),
                            ))
                    };
                    let current_device = &data.1;
                    let device_listener_data = data.2;

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
                                    if new_device
                                        .add_prop_listener(
                                            &DEVICE_IS_RUNNING_SOMEWHERE,
                                            device_listener,
                                            device_listener_data,
                                        )
                                        .is_ok()
                                    {
                                        *device_guard = Some(new_device);
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
                ));
                let device_listener_ptr = Box::into_raw(device_listener_data) as *mut ();

                let system_listener_data = Box::new((
                    callback.clone(),
                    current_device.clone(),
                    device_listener_ptr,
                ));
                let system_listener_ptr = Box::into_raw(system_listener_data) as *mut ();

                ca::System::OBJ
                    .add_prop_listener(
                        &ca::PropSelector::HW_DEFAULT_INPUT_DEVICE.global_addr(),
                        system_listener,
                        system_listener_ptr,
                    )
                    .unwrap();

                if let Ok(device) = ca::System::default_input_device() {
                    if device
                        .add_prop_listener(
                            &DEVICE_IS_RUNNING_SOMEWHERE,
                            device_listener,
                            device_listener_ptr,
                        )
                        .is_ok()
                    {
                        if let Ok(mut device_guard) = current_device.lock() {
                            *device_guard = Some(device);
                        }
                    }
                }

                let _ = tx.blocking_send(());

                ca::System::OBJ
                    .remove_prop_listener(
                        &ca::PropSelector::HW_DEFAULT_INPUT_DEVICE.global_addr(),
                        system_listener,
                        system_listener_ptr,
                    )
                    .unwrap();

                if let Ok(device_guard) = current_device.lock() {
                    if let Some(device) = &*device_guard {
                        let _ = device.remove_prop_listener(
                            &DEVICE_IS_RUNNING_SOMEWHERE,
                            device_listener,
                            device_listener_ptr,
                        );
                    }
                }

                unsafe {
                    let _ = Box::from_raw(
                        system_listener_ptr
                            as *mut (
                                std::sync::Arc<std::sync::Mutex<crate::DetectCallback>>,
                                std::sync::Arc<std::sync::Mutex<Option<ca::Device>>>,
                                *mut (),
                            ),
                    );
                    let _ = Box::from_raw(
                        device_listener_ptr
                            as *mut (
                                std::sync::Arc<std::sync::Mutex<crate::DetectCallback>>,
                                std::sync::Arc<std::sync::Mutex<Option<ca::Device>>>,
                            ),
                    );
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
