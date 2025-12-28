//! Real-time audio device change listening.
//!
//! Provides async/channel-based notification when audio devices change.

use tokio::sync::mpsc;

#[cfg(target_os = "macos")]
use std::sync::{Arc, Mutex};

#[cfg(target_os = "macos")]
use cidre::{core_audio as ca, dispatch};

use crate::Error;

/// Events that can be emitted by the device listener.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeviceChangeEvent {
    /// Device list changed (device connected/disconnected).
    DeviceListChanged,
    /// Default input device changed.
    DefaultInputChanged,
    /// Default output device changed.
    DefaultOutputChanged,
}

/// Handle for a running device listener.
///
/// Dropping this handle will stop the listener and clean up resources.
pub struct DeviceListenerHandle {
    #[cfg(target_os = "macos")]
    device_list_listener: Option<ca::PropListenerBlock>,
    #[cfg(target_os = "macos")]
    input_listener: Option<ca::PropListenerBlock>,
    #[cfg(target_os = "macos")]
    output_listener: Option<ca::PropListenerBlock>,
}

impl Drop for DeviceListenerHandle {
    fn drop(&mut self) {
        #[cfg(target_os = "macos")]
        {
            if let Some(listener) = self.device_list_listener.take() {
                let addr = ca::PropSelector::HW_DEVICES.global_addr();
                let _ = ca::System::OBJ.remove_prop_listener(&addr, &listener);
            }

            if let Some(listener) = self.input_listener.take() {
                let addr = ca::PropSelector::HW_DEFAULT_INPUT_DEVICE.global_addr();
                let _ = ca::System::OBJ.remove_prop_listener(&addr, &listener);
            }

            if let Some(listener) = self.output_listener.take() {
                let addr = ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE.global_addr();
                let _ = ca::System::OBJ.remove_prop_listener(&addr, &listener);
            }
        }
    }
}

/// Start listening for device changes on macOS.
///
/// Returns a channel receiver that will receive events when devices change,
/// and a handle that must be kept alive. When the handle is dropped, listening stops.
#[cfg(target_os = "macos")]
pub fn start_device_listener() -> Result<
    (
        mpsc::UnboundedReceiver<DeviceChangeEvent>,
        DeviceListenerHandle,
    ),
    Error,
> {
    let (tx, rx) = mpsc::unbounded_channel();

    let tx = Arc::new(Mutex::new(tx));

    let tx_devices = tx.clone();
    let device_list_listener = ca::PropListenerBlock::new(move |_num_addresses, _addresses| {
        if let Ok(tx) = tx_devices.lock() {
            let _ = tx.send(DeviceChangeEvent::DeviceListChanged);
        }
    });

    let addr = ca::PropSelector::HW_DEVICES.global_addr();
    ca::System::OBJ
        .add_prop_listener(&addr, dispatch::Queue::main(), &device_list_listener)
        .map_err(|e| {
            Error::AudioSystemError(format!("Failed to add device list listener: {:?}", e))
        })?;

    let tx_input = tx.clone();
    let input_listener = ca::PropListenerBlock::new(move |_num_addresses, _addresses| {
        if let Ok(tx) = tx_input.lock() {
            let _ = tx.send(DeviceChangeEvent::DefaultInputChanged);
        }
    });

    let addr = ca::PropSelector::HW_DEFAULT_INPUT_DEVICE.global_addr();
    ca::System::OBJ
        .add_prop_listener(&addr, dispatch::Queue::main(), &input_listener)
        .map_err(|e| Error::AudioSystemError(format!("Failed to add input listener: {:?}", e)))?;

    let tx_output = tx;
    let output_listener = ca::PropListenerBlock::new(move |_num_addresses, _addresses| {
        if let Ok(tx) = tx_output.lock() {
            let _ = tx.send(DeviceChangeEvent::DefaultOutputChanged);
        }
    });

    let addr = ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE.global_addr();
    ca::System::OBJ
        .add_prop_listener(&addr, dispatch::Queue::main(), &output_listener)
        .map_err(|e| Error::AudioSystemError(format!("Failed to add output listener: {:?}", e)))?;

    let handle = DeviceListenerHandle {
        device_list_listener: Some(device_list_listener),
        input_listener: Some(input_listener),
        output_listener: Some(output_listener),
    };

    Ok((rx, handle))
}

/// Start listening for device changes (Linux stub).
#[cfg(target_os = "linux")]
pub fn start_device_listener() -> Result<
    (
        mpsc::UnboundedReceiver<DeviceChangeEvent>,
        DeviceListenerHandle,
    ),
    Error,
> {
    Err(Error::PlatformNotSupported(
        "Device listener not implemented for Linux".to_string(),
    ))
}

/// Start listening for device changes (Windows stub).
#[cfg(target_os = "windows")]
pub fn start_device_listener() -> Result<
    (
        mpsc::UnboundedReceiver<DeviceChangeEvent>,
        DeviceListenerHandle,
    ),
    Error,
> {
    Err(Error::PlatformNotSupported(
        "Device listener not implemented for Windows".to_string(),
    ))
}
