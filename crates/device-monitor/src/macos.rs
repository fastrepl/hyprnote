use cidre::{core_audio as ca, ns, os};
use std::sync::mpsc;

use crate::{DeviceEvent, DeviceSwitch, DeviceUpdate};
use hypr_device_heuristic::macos::is_headphone_from_default_output_device;

struct DeviceSwitchContext {
    event_tx: mpsc::Sender<DeviceSwitch>,
}

struct VolumeMuteContext {
    update_device_listeners_tx: mpsc::Sender<()>,
}

struct CombinedContext {
    event_tx: mpsc::Sender<DeviceEvent>,
    update_device_listeners_tx: mpsc::Sender<()>,
}

extern "C-unwind" fn device_change_system_listener(
    _obj_id: ca::Obj,
    number_addresses: u32,
    addresses: *const ca::PropAddr,
    client_data: *mut (),
) -> os::Status {
    let context = unsafe { &*(client_data as *const DeviceSwitchContext) };
    let addresses = unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

    for addr in addresses {
        match addr.selector {
            ca::PropSelector::HW_DEFAULT_INPUT_DEVICE => {
                let _ = context.event_tx.send(DeviceSwitch::DefaultInputChanged);
            }
            ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE => {
                let headphone = is_headphone_from_default_output_device();
                let _ = context
                    .event_tx
                    .send(DeviceSwitch::DefaultOutputChanged { headphone });
            }
            _ => {}
        }
    }
    os::Status::NO_ERR
}

extern "C-unwind" fn volume_mute_system_listener(
    _obj_id: ca::Obj,
    number_addresses: u32,
    addresses: *const ca::PropAddr,
    client_data: *mut (),
) -> os::Status {
    let context = unsafe { &*(client_data as *const VolumeMuteContext) };
    let addresses = unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

    for addr in addresses {
        if addr.selector == ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE {
            let _ = context.update_device_listeners_tx.send(());
        }
    }
    os::Status::NO_ERR
}

extern "C-unwind" fn combined_system_listener(
    _obj_id: ca::Obj,
    number_addresses: u32,
    addresses: *const ca::PropAddr,
    client_data: *mut (),
) -> os::Status {
    let context = unsafe { &*(client_data as *const CombinedContext) };
    let addresses = unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

    for addr in addresses {
        match addr.selector {
            ca::PropSelector::HW_DEFAULT_INPUT_DEVICE => {
                let _ = context
                    .event_tx
                    .send(DeviceEvent::Switch(DeviceSwitch::DefaultInputChanged));
            }
            ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE => {
                let headphone = is_headphone_from_default_output_device();
                let _ = context.event_tx.send(DeviceEvent::Switch(
                    DeviceSwitch::DefaultOutputChanged { headphone },
                ));
                let _ = context.update_device_listeners_tx.send(());
            }
            _ => {}
        }
    }
    os::Status::NO_ERR
}

extern "C-unwind" fn volume_mute_device_listener(
    _obj_id: ca::Obj,
    number_addresses: u32,
    addresses: *const ca::PropAddr,
    client_data: *mut (),
) -> os::Status {
    let event_tx = unsafe { &*(client_data as *const mpsc::Sender<DeviceUpdate>) };
    let addresses = unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

    for addr in addresses {
        match addr.selector {
            ca::PropSelector::DEVICE_VOLUME_SCALAR => {
                if let Ok(device) = ca::System::default_output_device() {
                    if let Ok(uid) = device.uid() {
                        let volume_addr = ca::PropSelector::DEVICE_VOLUME_SCALAR
                            .addr(ca::PropScope::OUTPUT, addr.element);
                        if let Ok(volume) = device.prop::<f32>(&volume_addr) {
                            let _ = event_tx.send(DeviceUpdate::VolumeChanged {
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
                            let _ = event_tx.send(DeviceUpdate::MuteChanged {
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

extern "C-unwind" fn combined_device_listener(
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
                            .addr(ca::PropScope::OUTPUT, addr.element);
                        if let Ok(volume) = device.prop::<f32>(&volume_addr) {
                            let _ =
                                event_tx.send(DeviceEvent::Update(DeviceUpdate::VolumeChanged {
                                    device_uid: uid.to_string(),
                                    volume,
                                }));
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
                            let _ = event_tx.send(DeviceEvent::Update(DeviceUpdate::MuteChanged {
                                device_uid: uid.to_string(),
                                is_muted: mute_value != 0,
                            }));
                        }
                    }
                }
            }
            _ => {}
        }
    }
    os::Status::NO_ERR
}

fn get_volume_elements(device: &ca::Device) -> Vec<ca::PropElement> {
    let main_addr =
        ca::PropSelector::DEVICE_VOLUME_SCALAR.addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);

    if device.prop::<f32>(&main_addr).is_ok() {
        return vec![ca::PropElement::MAIN];
    }

    let mut elements = Vec::new();
    for i in 1..=2 {
        let element = ca::PropElement(i);
        let addr = ca::PropSelector::DEVICE_VOLUME_SCALAR.addr(ca::PropScope::OUTPUT, element);
        if device.prop::<f32>(&addr).is_ok() {
            elements.push(element);
        }
    }
    elements
}

fn add_volume_mute_listeners(
    device: &ca::Device,
    event_tx_ptr: *mut (),
    listener: extern "C-unwind" fn(ca::Obj, u32, *const ca::PropAddr, *mut ()) -> os::Status,
) -> Result<Vec<ca::PropElement>, cidre::os::Status> {
    let volume_elements = get_volume_elements(device);

    for element in &volume_elements {
        let volume_addr =
            ca::PropSelector::DEVICE_VOLUME_SCALAR.addr(ca::PropScope::OUTPUT, *element);
        device.add_prop_listener(&volume_addr, listener, event_tx_ptr)?;
    }

    let mute_addr =
        ca::PropSelector::DEVICE_PROCESS_MUTE.addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);
    let _ = device.add_prop_listener(&mute_addr, listener, event_tx_ptr);

    Ok(volume_elements)
}

fn remove_volume_mute_listeners(
    device: &ca::Device,
    event_tx_ptr: *mut (),
    listener: extern "C-unwind" fn(ca::Obj, u32, *const ca::PropAddr, *mut ()) -> os::Status,
    volume_elements: &[ca::PropElement],
) {
    for element in volume_elements {
        let volume_addr =
            ca::PropSelector::DEVICE_VOLUME_SCALAR.addr(ca::PropScope::OUTPUT, *element);
        let _ = device.remove_prop_listener(&volume_addr, listener, event_tx_ptr);
    }

    let mute_addr =
        ca::PropSelector::DEVICE_PROCESS_MUTE.addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);
    let _ = device.remove_prop_listener(&mute_addr, listener, event_tx_ptr);
}

pub(crate) fn monitor_device_change(
    event_tx: mpsc::Sender<DeviceSwitch>,
    stop_rx: mpsc::Receiver<()>,
) {
    let selectors = [
        ca::PropSelector::HW_DEFAULT_INPUT_DEVICE,
        ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE,
    ];

    let context = DeviceSwitchContext { event_tx };
    let context_ptr = &context as *const DeviceSwitchContext as *mut ();

    for selector in selectors {
        if let Err(e) = ca::System::OBJ.add_prop_listener(
            &selector.global_addr(),
            device_change_system_listener,
            context_ptr,
        ) {
            tracing::error!("system_listener_add_failed: {:?}", e);
            return;
        }
    }

    tracing::info!("monitor_device_change_started");

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
            device_change_system_listener,
            context_ptr,
        );
    }

    tracing::info!("monitor_device_change_stopped");
}

pub(crate) fn monitor_volume_mute(
    event_tx: mpsc::Sender<DeviceUpdate>,
    stop_rx: mpsc::Receiver<()>,
) {
    let (update_device_listeners_tx, update_device_listeners_rx) = mpsc::channel();

    let context = VolumeMuteContext {
        update_device_listeners_tx,
    };
    let context_ptr = &context as *const VolumeMuteContext as *mut ();
    let event_tx_ptr = &event_tx as *const mpsc::Sender<DeviceUpdate> as *mut ();

    if let Err(e) = ca::System::OBJ.add_prop_listener(
        &ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE.global_addr(),
        volume_mute_system_listener,
        context_ptr,
    ) {
        tracing::error!("system_listener_add_failed: {:?}", e);
        return;
    }

    let mut current_device: Option<ca::Device> = None;
    let mut current_volume_elements: Vec<ca::PropElement> = Vec::new();

    if let Ok(device) = ca::System::default_output_device() {
        if !device.is_unknown() {
            match add_volume_mute_listeners(&device, event_tx_ptr, volume_mute_device_listener) {
                Ok(elements) => {
                    current_volume_elements = elements;
                    current_device = Some(device);
                }
                Err(e) => {
                    tracing::error!("device_listener_add_failed: {:?}", e);
                }
            }
        }
    }

    tracing::info!("monitor_volume_mute_started");

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
                remove_volume_mute_listeners(
                    old_device,
                    event_tx_ptr,
                    volume_mute_device_listener,
                    &current_volume_elements,
                );
            }

            current_device = None;
            current_volume_elements.clear();

            if let Ok(device) = ca::System::default_output_device() {
                if !device.is_unknown() {
                    match add_volume_mute_listeners(
                        &device,
                        event_tx_ptr,
                        volume_mute_device_listener,
                    ) {
                        Ok(elements) => {
                            current_volume_elements = elements;
                            current_device = Some(device);
                        }
                        Err(e) => {
                            tracing::error!("device_listener_update_failed: {:?}", e);
                        }
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
        remove_volume_mute_listeners(
            device,
            event_tx_ptr,
            volume_mute_device_listener,
            &current_volume_elements,
        );
    }

    let _ = ca::System::OBJ.remove_prop_listener(
        &ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE.global_addr(),
        volume_mute_system_listener,
        context_ptr,
    );

    tracing::info!("monitor_volume_mute_stopped");
}

pub(crate) fn monitor(event_tx: mpsc::Sender<DeviceEvent>, stop_rx: mpsc::Receiver<()>) {
    let selectors = [
        ca::PropSelector::HW_DEFAULT_INPUT_DEVICE,
        ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE,
    ];

    let (update_device_listeners_tx, update_device_listeners_rx) = mpsc::channel();

    let context = CombinedContext {
        event_tx: event_tx.clone(),
        update_device_listeners_tx,
    };
    let context_ptr = &context as *const CombinedContext as *mut ();
    let event_tx_ptr = &event_tx as *const mpsc::Sender<DeviceEvent> as *mut ();

    for selector in selectors {
        if let Err(e) = ca::System::OBJ.add_prop_listener(
            &selector.global_addr(),
            combined_system_listener,
            context_ptr,
        ) {
            tracing::error!("system_listener_add_failed: {:?}", e);
            return;
        }
    }

    let mut current_device: Option<ca::Device> = None;
    let mut current_volume_elements: Vec<ca::PropElement> = Vec::new();

    if let Ok(device) = ca::System::default_output_device() {
        if !device.is_unknown() {
            match add_volume_mute_listeners(&device, event_tx_ptr, combined_device_listener) {
                Ok(elements) => {
                    current_volume_elements = elements;
                    current_device = Some(device);
                }
                Err(e) => {
                    tracing::error!("device_listener_add_failed: {:?}", e);
                }
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
                remove_volume_mute_listeners(
                    old_device,
                    event_tx_ptr,
                    combined_device_listener,
                    &current_volume_elements,
                );
            }

            current_device = None;
            current_volume_elements.clear();

            if let Ok(device) = ca::System::default_output_device() {
                if !device.is_unknown() {
                    match add_volume_mute_listeners(&device, event_tx_ptr, combined_device_listener)
                    {
                        Ok(elements) => {
                            current_volume_elements = elements;
                            current_device = Some(device);
                        }
                        Err(e) => {
                            tracing::error!("device_listener_update_failed: {:?}", e);
                        }
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
        remove_volume_mute_listeners(
            device,
            event_tx_ptr,
            combined_device_listener,
            &current_volume_elements,
        );
    }

    for selector in selectors {
        let _ = ca::System::OBJ.remove_prop_listener(
            &selector.global_addr(),
            combined_system_listener,
            context_ptr,
        );
    }

    tracing::info!("monitor_stopped");
}
