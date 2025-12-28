//! Real-time audio device change listening.
//!
//! Provides async/channel-based notification when audio devices change.

use tokio::sync::mpsc;

#[cfg(target_os = "macos")]
use std::sync::{Arc, Mutex};

#[cfg(target_os = "macos")]
use cidre::{core_audio as ca, dispatch};

use crate::{DeviceId, Error};

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

/// Events for mute/volume changes.
#[derive(Debug, Clone, PartialEq)]
pub enum MuteVolumeChangeEvent {
    /// A device's mute status changed.
    MuteChanged { device_id: DeviceId },
    /// A device's volume changed.
    VolumeChanged {
        device_id: DeviceId,
        new_volume: f32,
    },
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

/// Handle for mute/volume listeners.
///
/// Dropping this handle will stop the listeners and clean up resources.
pub struct MuteVolumeListenerHandle {
    #[cfg(target_os = "macos")]
    listeners: Vec<(ca::DeviceId, ca::PropListenerBlock)>,
}

impl Drop for MuteVolumeListenerHandle {
    fn drop(&mut self) {
        #[cfg(target_os = "macos")]
        {
            for (device_id, listener) in self.listeners.drain(..) {
                let device = ca::Device(device_id);

                let addr = ca::PropAddress {
                    selector: ca::PropSelector::DEVICE_MUTE,
                    scope: ca::PropScope::OUTPUT,
                    element: ca::PropElement::MAIN,
                };
                let _ = device.remove_prop_listener(&addr, &listener);

                let addr = ca::PropAddress {
                    selector: ca::PropSelector::DEVICE_MUTE,
                    scope: ca::PropScope::INPUT,
                    element: ca::PropElement::MAIN,
                };
                let _ = device.remove_prop_listener(&addr, &listener);

                let addr = ca::PropAddress {
                    selector: ca::PropSelector::HW_VIRTUAL_MAIN_VOLUME,
                    scope: ca::PropScope::OUTPUT,
                    element: ca::PropElement::MAIN,
                };
                let _ = device.remove_prop_listener(&addr, &listener);
            }
        }
    }
}

/// Start listening for mute/volume changes on all devices (macOS).
///
/// Returns a channel receiver that will receive events when mute/volume changes occur,
/// and a handle that must be kept alive. When the handle is dropped, listening stops.
///
/// This function registers listeners for:
/// - `kAudioDevicePropertyMute` on output scope (per device)
/// - `kAudioDevicePropertyMute` on input scope (per device)
/// - `kAudioHardwareServiceDeviceProperty_VirtualMainVolume` on output scope (per device)
///
/// # Note
/// This should be called after device list changes to ensure all devices are monitored.
/// Use `update_mute_volume_listener()` to refresh listeners when devices change.
#[cfg(target_os = "macos")]
pub fn start_mute_volume_listener() -> Result<
    (
        mpsc::UnboundedReceiver<MuteVolumeChangeEvent>,
        MuteVolumeListenerHandle,
    ),
    Error,
> {
    let (tx, rx) = mpsc::unbounded_channel();
    let tx = Arc::new(Mutex::new(tx));

    let ca_devices =
        ca::System::devices().map_err(|e| Error::EnumerationFailed(format!("{:?}", e)))?;

    let mut listeners = Vec::new();

    for ca_device in ca_devices {
        let device_id = ca_device.0;

        let uid = match ca_device.uid() {
            Ok(uid) => DeviceId::new(uid.to_string()),
            Err(_) => continue,
        };

        let tx_clone = tx.clone();
        let uid_clone = uid.clone();

        let listener = ca::PropListenerBlock::new(move |_num_addresses, _addresses| {
            if let Ok(tx) = tx_clone.lock() {
                let _ = tx.send(MuteVolumeChangeEvent::MuteChanged {
                    device_id: uid_clone.clone(),
                });
            }
        });

        let addr = ca::PropAddress {
            selector: ca::PropSelector::DEVICE_MUTE,
            scope: ca::PropScope::OUTPUT,
            element: ca::PropElement::MAIN,
        };
        let _ = ca_device.add_prop_listener(&addr, dispatch::Queue::main(), &listener);

        let addr = ca::PropAddress {
            selector: ca::PropSelector::DEVICE_MUTE,
            scope: ca::PropScope::INPUT,
            element: ca::PropElement::MAIN,
        };
        let _ = ca_device.add_prop_listener(&addr, dispatch::Queue::main(), &listener);

        let addr = ca::PropAddress {
            selector: ca::PropSelector::HW_VIRTUAL_MAIN_VOLUME,
            scope: ca::PropScope::OUTPUT,
            element: ca::PropElement::MAIN,
        };
        let _ = ca_device.add_prop_listener(&addr, dispatch::Queue::main(), &listener);

        listeners.push((device_id, listener));
    }

    let handle = MuteVolumeListenerHandle { listeners };

    Ok((rx, handle))
}

/// Update mute/volume listeners when device list changes (macOS).
///
/// This drops the old handle (removing old listeners) and creates a new one
/// with the current device list.
///
/// This should be called after receiving a `DeviceListChanged` event to ensure
/// newly connected devices are monitored and disconnected devices are removed.
#[cfg(target_os = "macos")]
pub fn update_mute_volume_listener(
    old_handle: MuteVolumeListenerHandle,
) -> Result<
    (
        mpsc::UnboundedReceiver<MuteVolumeChangeEvent>,
        MuteVolumeListenerHandle,
    ),
    Error,
> {
    drop(old_handle);
    start_mute_volume_listener()
}

/// Start listening for mute/volume changes (Linux stub).
#[cfg(target_os = "linux")]
pub fn start_mute_volume_listener() -> Result<
    (
        mpsc::UnboundedReceiver<MuteVolumeChangeEvent>,
        MuteVolumeListenerHandle,
    ),
    Error,
> {
    Err(Error::PlatformNotSupported(
        "Mute/volume listener not implemented for Linux".to_string(),
    ))
}

/// Update mute/volume listeners when device list changes (Linux stub).
#[cfg(target_os = "linux")]
pub fn update_mute_volume_listener(
    _old_handle: MuteVolumeListenerHandle,
) -> Result<
    (
        mpsc::UnboundedReceiver<MuteVolumeChangeEvent>,
        MuteVolumeListenerHandle,
    ),
    Error,
> {
    Err(Error::PlatformNotSupported(
        "Mute/volume listener not implemented for Linux".to_string(),
    ))
}

/// Start listening for mute/volume changes (Windows stub).
#[cfg(target_os = "windows")]
pub fn start_mute_volume_listener() -> Result<
    (
        mpsc::UnboundedReceiver<MuteVolumeChangeEvent>,
        MuteVolumeListenerHandle,
    ),
    Error,
> {
    Err(Error::PlatformNotSupported(
        "Mute/volume listener not implemented for Windows".to_string(),
    ))
}

/// Update mute/volume listeners when device list changes (Windows stub).
#[cfg(target_os = "windows")]
pub fn update_mute_volume_listener(
    _old_handle: MuteVolumeListenerHandle,
) -> Result<
    (
        mpsc::UnboundedReceiver<MuteVolumeChangeEvent>,
        MuteVolumeListenerHandle,
    ),
    Error,
> {
    Err(Error::PlatformNotSupported(
        "Mute/volume listener not implemented for Windows".to_string(),
    ))
}
