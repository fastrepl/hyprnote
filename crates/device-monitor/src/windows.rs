use crate::DeviceEvent;
use std::sync::mpsc;

pub(crate) fn monitor(_event_tx: mpsc::Sender<DeviceEvent>, stop_rx: mpsc::Receiver<()>) {
    tracing::warn!("device_monitoring_unsupported_on_windows");
    let _ = stop_rx.recv();
}
