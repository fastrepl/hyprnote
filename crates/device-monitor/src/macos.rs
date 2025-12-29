use cidre::{core_audio as ca, ns, os};
use std::sync::mpsc;

use crate::{DeviceEvent, DeviceSwitch, DeviceUpdate};
use hypr_device_heuristic::macos::is_headphone_from_default_output_device;

type ListenerFn = extern "C-unwind" fn(ca::Obj, u32, *const ca::PropAddr, *mut ()) -> os::Status;

trait UpdateSender {
    fn send_update(&self, update: DeviceUpdate);
}

impl UpdateSender for mpsc::Sender<DeviceUpdate> {
    fn send_update(&self, update: DeviceUpdate) {
        let _ = self.send(update);
    }
}

impl UpdateSender for mpsc::Sender<DeviceEvent> {
    fn send_update(&self, update: DeviceUpdate) {
        let _ = self.send(DeviceEvent::Update(update));
    }
}

fn as_ptr<T>(value: &T) -> *mut () {
    value as *const T as *mut ()
}

fn run_event_loop<F>(stop_rx: mpsc::Receiver<()>, mut on_tick: F)
where
    F: FnMut() -> bool,
{
    let run_loop = ns::RunLoop::current();
    let (stop_notifier_tx, stop_notifier_rx) = mpsc::channel();

    std::thread::spawn(move || {
        let _ = stop_rx.recv();
        let _ = stop_notifier_tx.send(());
    });

    loop {
        run_loop.run_until_date(&ns::Date::distant_future());

        if !on_tick() {
            break;
        }

        if stop_notifier_rx.try_recv().is_ok() {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
}

struct VolumeMuteListeners {
    device: ca::Device,
    volume_elements: Vec<ca::PropElement>,
    listener: ListenerFn,
    event_tx_ptr: *mut (),
}

impl VolumeMuteListeners {
    fn new(device: ca::Device, listener: ListenerFn, event_tx_ptr: *mut ()) -> Option<Self> {
        if device.is_unknown() {
            return None;
        }

        let volume_elements = get_volume_elements(&device);

        for element in &volume_elements {
            let addr = ca::PropSelector::DEVICE_VOLUME_SCALAR.addr(ca::PropScope::OUTPUT, *element);
            if device
                .add_prop_listener(&addr, listener, event_tx_ptr)
                .is_err()
            {
                return None;
            }
        }

        let mute_addr = ca::PropSelector::DEVICE_PROCESS_MUTE
            .addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);
        let _ = device.add_prop_listener(&mute_addr, listener, event_tx_ptr);

        Some(Self {
            device,
            volume_elements,
            listener,
            event_tx_ptr,
        })
    }

    fn update(&mut self) {
        self.remove_listeners();

        if let Ok(device) = ca::System::default_output_device()
            && !device.is_unknown()
        {
            let volume_elements = get_volume_elements(&device);

            let mut success = true;
            for element in &volume_elements {
                let addr =
                    ca::PropSelector::DEVICE_VOLUME_SCALAR.addr(ca::PropScope::OUTPUT, *element);
                if device
                    .add_prop_listener(&addr, self.listener, self.event_tx_ptr)
                    .is_err()
                {
                    success = false;
                    break;
                }
            }

            if success {
                let mute_addr = ca::PropSelector::DEVICE_PROCESS_MUTE
                    .addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);
                let _ = device.add_prop_listener(&mute_addr, self.listener, self.event_tx_ptr);

                self.device = device;
                self.volume_elements = volume_elements;
            } else {
                tracing::error!("device_listener_update_failed");
            }
        }
    }

    fn remove_listeners(&self) {
        for element in &self.volume_elements {
            let addr = ca::PropSelector::DEVICE_VOLUME_SCALAR.addr(ca::PropScope::OUTPUT, *element);
            let _ = self
                .device
                .remove_prop_listener(&addr, self.listener, self.event_tx_ptr);
        }

        let mute_addr = ca::PropSelector::DEVICE_PROCESS_MUTE
            .addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);
        let _ = self
            .device
            .remove_prop_listener(&mute_addr, self.listener, self.event_tx_ptr);
    }
}

impl Drop for VolumeMuteListeners {
    fn drop(&mut self) {
        self.remove_listeners();
    }
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

fn handle_volume_mute_event<S: UpdateSender>(sender: &S, addr: &ca::PropAddr) {
    match addr.selector {
        ca::PropSelector::DEVICE_VOLUME_SCALAR => {
            if let Ok(device) = ca::System::default_output_device()
                && let Ok(uid) = device.uid()
            {
                let volume_addr = ca::PropSelector::DEVICE_VOLUME_SCALAR
                    .addr(ca::PropScope::OUTPUT, addr.element);
                if let Ok(volume) = device.prop::<f32>(&volume_addr) {
                    sender.send_update(DeviceUpdate::VolumeChanged {
                        device_uid: uid.to_string(),
                        volume,
                    });
                }
            }
        }
        ca::PropSelector::DEVICE_PROCESS_MUTE => {
            if let Ok(device) = ca::System::default_output_device()
                && let Ok(uid) = device.uid()
            {
                let mute_addr = ca::PropSelector::DEVICE_PROCESS_MUTE
                    .addr(ca::PropScope::OUTPUT, ca::PropElement::MAIN);
                if let Ok(mute_value) = device.prop::<u32>(&mute_addr) {
                    sender.send_update(DeviceUpdate::MuteChanged {
                        device_uid: uid.to_string(),
                        is_muted: mute_value != 0,
                    });
                }
            }
        }
        _ => {}
    }
}

struct DeviceSwitchContext {
    event_tx: mpsc::Sender<DeviceSwitch>,
}

extern "C-unwind" fn device_switch_system_listener(
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

struct VolumeMuteContext {
    update_device_listeners_tx: mpsc::Sender<()>,
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

struct CombinedContext {
    event_tx: mpsc::Sender<DeviceEvent>,
    update_device_listeners_tx: mpsc::Sender<()>,
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
    let sender = unsafe { &*(client_data as *const mpsc::Sender<DeviceUpdate>) };
    let addresses = unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

    for addr in addresses {
        handle_volume_mute_event(sender, addr);
    }
    os::Status::NO_ERR
}

extern "C-unwind" fn combined_device_listener(
    _obj_id: ca::Obj,
    number_addresses: u32,
    addresses: *const ca::PropAddr,
    client_data: *mut (),
) -> os::Status {
    let sender = unsafe { &*(client_data as *const mpsc::Sender<DeviceEvent>) };
    let addresses = unsafe { std::slice::from_raw_parts(addresses, number_addresses as usize) };

    for addr in addresses {
        handle_volume_mute_event(sender, addr);
    }
    os::Status::NO_ERR
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
    let context_ptr = as_ptr(&context);

    for selector in selectors {
        if let Err(e) = ca::System::OBJ.add_prop_listener(
            &selector.global_addr(),
            device_switch_system_listener,
            context_ptr,
        ) {
            tracing::error!("system_listener_add_failed: {:?}", e);
            return;
        }
    }

    tracing::info!("monitor_device_change_started");

    run_event_loop(stop_rx, || true);

    for selector in selectors {
        let _ = ca::System::OBJ.remove_prop_listener(
            &selector.global_addr(),
            device_switch_system_listener,
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
    let context_ptr = as_ptr(&context);
    let event_tx_ptr = as_ptr(&event_tx);

    if let Err(e) = ca::System::OBJ.add_prop_listener(
        &ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE.global_addr(),
        volume_mute_system_listener,
        context_ptr,
    ) {
        tracing::error!("system_listener_add_failed: {:?}", e);
        return;
    }

    let mut listeners = ca::System::default_output_device().ok().and_then(|device| {
        VolumeMuteListeners::new(device, volume_mute_device_listener, event_tx_ptr)
    });

    tracing::info!("monitor_volume_mute_started");

    run_event_loop(stop_rx, || {
        if update_device_listeners_rx.try_recv().is_ok() {
            if let Some(ref mut l) = listeners {
                l.update();
            } else if let Ok(device) = ca::System::default_output_device() {
                listeners =
                    VolumeMuteListeners::new(device, volume_mute_device_listener, event_tx_ptr);
            }
        }
        true
    });

    drop(listeners);

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
    let context_ptr = as_ptr(&context);
    let event_tx_ptr = as_ptr(&event_tx);

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

    let mut listeners = ca::System::default_output_device().ok().and_then(|device| {
        VolumeMuteListeners::new(device, combined_device_listener, event_tx_ptr)
    });

    tracing::info!("monitor_started");

    run_event_loop(stop_rx, || {
        if update_device_listeners_rx.try_recv().is_ok() {
            if let Some(ref mut l) = listeners {
                l.update();
            } else if let Ok(device) = ca::System::default_output_device() {
                listeners =
                    VolumeMuteListeners::new(device, combined_device_listener, event_tx_ptr);
            }
        }
        true
    });

    drop(listeners);

    for selector in selectors {
        let _ = ca::System::OBJ.remove_prop_listener(
            &selector.global_addr(),
            combined_system_listener,
            context_ptr,
        );
    }

    tracing::info!("monitor_stopped");
}
