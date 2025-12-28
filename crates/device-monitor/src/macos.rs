use crate::DeviceEvent;
use cidre::{cf, core_audio as ca, ns, os};
use hypr_device_heuristic::macos::is_headphone_from_default_output_device;
use std::sync::mpsc;

struct ListenerContext {
    event_tx: mpsc::Sender<DeviceEvent>,
    update_device_listeners_tx: mpsc::Sender<()>,
}

extern "C-unwind" fn system_listener(
    _obj_id: ca::Obj,
    number_addresses: u32,
    addresses: *const ca::PropAddr,
    client_data: *mut (),
) -> os::Status {
    let context = unsafe { &*(client_data as *const ListenerContext) };
    let addresses = unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

    for addr in addresses {
        match addr.selector {
            ca::PropSelector::HW_DEFAULT_INPUT_DEVICE => {
                let _ = context.event_tx.send(DeviceEvent::DefaultInputChanged);
            }
            ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE => {
                let headphone = is_headphone_from_default_output_device();
                let _ = context
                    .event_tx
                    .send(DeviceEvent::DefaultOutputChanged { headphone });
                let _ = context.update_device_listeners_tx.send(());
            }
            _ => {}
        }
    }
    os::Status::NO_ERR
}

extern "C-unwind" fn device_listener(
    _obj_id: ca::Obj,
    number_addresses: u32,
    addresses: *const ca::PropAddr,
    client_data: *mut (),
) -> os::Status {
    let event_tx = unsafe { &*(client_data as *const mpsc::Sender<DeviceEvent>) };
    let addresses = unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

    for addr in addresses {
        match addr.selector {
            ca::PropSelector::DEVICE_VOLUME_SCALAR => {
                if let Ok(device) = ca::System::default_output_device() {
                    if let Ok(uid) = device.uid() {
                        let volume_addr = ca::PropSelector::DEVICE_VOLUME_SCALAR
                            .addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);
                        if let Ok(volume) = device.prop::<f32>(&volume_addr) {
                            let _ = event_tx.send(DeviceEvent::VolumeChanged {
                                device_uid: uid.to_string(),
                                volume,
                            });
                        }
                    }
                }
            }
            ca::PropSelector::DEVICE_PROCESS_MUTE => {
                if let Ok(device) = ca::System::default_output_device() {
                    if let Ok(uid) = device.uid() {
                        let mute_addr = ca::PropSelector::DEVICE_PROCESS_MUTE
                            .addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);
                        if let Ok(mute_value) = device.prop::<u32>(&mute_addr) {
                            let _ = event_tx.send(DeviceEvent::MuteChanged {
                                device_uid: uid.to_string(),
                                is_muted: mute_value != 0,
                            });
                        }
                    }
                }
            }
            _ => {}
        }
    }
    os::Status::NO_ERR
}

fn add_device_listeners(
    device: &ca::Device,
    event_tx_ptr: *mut (),
) -> Result<(), cidre::os::Status> {
    let volume_addr =
        ca::PropSelector::DEVICE_VOLUME_SCALAR.addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);
    device.add_prop_listener(&volume_addr, device_listener, event_tx_ptr)?;

    let mute_addr =
        ca::PropSelector::DEVICE_PROCESS_MUTE.addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);
    device.add_prop_listener(&mute_addr, device_listener, event_tx_ptr)?;

    Ok(())
}

fn remove_device_listeners(
    device: &ca::Device,
    event_tx_ptr: *mut (),
) -> Result<(), cidre::os::Status> {
    let volume_addr =
        ca::PropSelector::DEVICE_VOLUME_SCALAR.addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);
    device.remove_prop_listener(&volume_addr, device_listener, event_tx_ptr)?;

    let mute_addr =
        ca::PropSelector::DEVICE_PROCESS_MUTE.addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);
    device.remove_prop_listener(&mute_addr, device_listener, event_tx_ptr)?;

    Ok(())
}

pub(crate) fn monitor(event_tx: mpsc::Sender<DeviceEvent>, stop_rx: mpsc::Receiver<()>) {
    let selectors = [
        ca::PropSelector::HW_DEFAULT_INPUT_DEVICE,
        ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE,
    ];

    let (update_device_listeners_tx, update_device_listeners_rx) = mpsc::channel();

    let context = ListenerContext {
        event_tx: event_tx.clone(),
        update_device_listeners_tx,
    };
    let context_ptr = &context as *const ListenerContext as *mut ();
    let event_tx_ptr = &event_tx as *const mpsc::Sender<DeviceEvent> as *mut ();

    for selector in selectors {
        if let Err(e) =
            ca::System::OBJ.add_prop_listener(&selector.global_addr(), system_listener, context_ptr)
        {
            tracing::error!("system_listener_add_failed: {:?}", e);
            return;
        }
    }

    let mut current_device: Option<ca::Device> = None;

    if let Ok(device) = ca::System::default_output_device() {
        if !device.is_unknown() {
            if let Err(e) = add_device_listeners(&device, event_tx_ptr) {
                tracing::error!("device_listener_add_failed: {:?}", e);
            } else {
                current_device = Some(device);
            }
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

        if let Ok(()) = update_device_listeners_rx.try_recv() {
            if let Some(ref old_device) = current_device {
                let _ = remove_device_listeners(old_device, event_tx_ptr);
            }

            current_device = None;

            if let Ok(device) = ca::System::default_output_device() {
                if !device.is_unknown() {
                    if let Err(e) = add_device_listeners(&device, event_tx_ptr) {
                        tracing::error!("device_listener_update_failed: {:?}", e);
                    } else {
                        current_device = Some(device);
                    }
                }
            }
        }

        if stop_notifier_rx.try_recv().is_ok() {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }

    if let Some(ref device) = current_device {
        let _ = remove_device_listeners(device, event_tx_ptr);
    }

    for selector in selectors {
        let _ = ca::System::OBJ.remove_prop_listener(
            &selector.global_addr(),
            system_listener,
            context_ptr,
        );
    }

    tracing::info!("monitor_stopped");
}
