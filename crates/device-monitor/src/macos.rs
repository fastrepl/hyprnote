use crate::DeviceEvent;
use cidre::{core_audio as ca, ns, os};
use hypr_device_heuristic::macos::is_headphone_from_default_output_device;
use std::sync::mpsc;

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

pub(crate) fn monitor(event_tx: mpsc::Sender<DeviceEvent>, stop_rx: mpsc::Receiver<()>) {
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
        let _ =
            ca::System::OBJ.remove_prop_listener(&selector.global_addr(), listener, event_tx_ptr);
    }

    tracing::info!("monitor_stopped");
}
