use crate::DeviceEvent;
use libpulse_binding::{
    context::{
        Context, FlagSet as ContextFlagSet,
        subscribe::{Facility, InterestMaskSet, Operation},
    },
    mainloop::threaded::Mainloop,
    proplist::Proplist,
};
use std::cell::RefCell;
use std::rc::Rc;
use std::sync::mpsc;

pub(crate) fn monitor(event_tx: mpsc::Sender<DeviceEvent>, stop_rx: mpsc::Receiver<()>) {
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

    context.borrow_mut().subscribe(
        InterestMaskSet::SINK | InterestMaskSet::SOURCE | InterestMaskSet::SERVER,
        |success| {
            if !success {
                tracing::error!("Failed to subscribe to PulseAudio events");
            }
        },
    );

    let event_tx_for_callback = event_tx.clone();
    context.borrow_mut().set_subscribe_callback(Some(Box::new(
        move |facility, operation, _index| match (facility, operation) {
            (Some(Facility::Server), Some(Operation::Changed)) => {
                let _ = event_tx_for_callback.send(DeviceEvent::DefaultInputChanged);
                let _ = event_tx_for_callback.send(DeviceEvent::DefaultOutputChanged {
                    headphone: is_headphone_from_default_output_device(),
                });
            }
            (Some(Facility::Sink), Some(Operation::Changed | Operation::New)) => {
                let _ = event_tx_for_callback.send(DeviceEvent::DefaultOutputChanged {
                    headphone: is_headphone_from_default_output_device(),
                });
            }
            (Some(Facility::Source), Some(Operation::Changed | Operation::New)) => {
                let _ = event_tx_for_callback.send(DeviceEvent::DefaultInputChanged);
            }
            _ => {}
        },
    )));

    mainloop.borrow_mut().unlock();

    tracing::info!("monitor_started");

    let _ = stop_rx.recv();

    mainloop.borrow_mut().lock();
    context.borrow_mut().disconnect();
    mainloop.borrow_mut().unlock();

    mainloop.borrow_mut().stop();

    tracing::info!("monitor_stopped");
}

fn is_headphone_from_default_output_device() -> bool {
    hypr_device_heuristic::linux::is_headphone_from_default_output_device()
}
