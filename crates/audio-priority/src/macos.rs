//! macOS CoreAudio backend for audio device management.
//!
//! Uses cidre for CoreAudio bindings to enumerate devices, get/set default devices,
//! and detect device types (headphone vs speaker).

use cidre::{cf, core_audio as ca};

use crate::{AudioDevice, AudioDeviceBackend, AudioDirection, DeviceId, Error, TransportType};

pub struct MacOSBackend;

impl MacOSBackend {
    fn ca_transport_to_transport_type(transport: ca::DeviceTransportType) -> TransportType {
        if transport == ca::DeviceTransportType::BUILT_IN {
            TransportType::BuiltIn
        } else if transport == ca::DeviceTransportType::USB {
            TransportType::Usb
        } else if transport == ca::DeviceTransportType::BLUETOOTH
            || transport == ca::DeviceTransportType::BLUETOOTH_LE
        {
            TransportType::Bluetooth
        } else if transport == ca::DeviceTransportType::HDMI
            || transport == ca::DeviceTransportType::DISPLAY_PORT
        {
            TransportType::Hdmi
        } else if transport == ca::DeviceTransportType::PCI {
            TransportType::Pci
        } else if transport == ca::DeviceTransportType::VIRTUAL
            || transport == ca::DeviceTransportType::AGGREGATE
        {
            TransportType::Virtual
        } else {
            TransportType::Unknown
        }
    }

    fn has_streams(device: &ca::Device, scope: ca::PropScope) -> bool {
        let addr = ca::PropSelector::DEVICE_STREAMS.addr(scope, ca::PropElement::MAIN);
        device
            .prop_size(&addr)
            .map(|size| size > 0)
            .unwrap_or(false)
    }

    fn create_audio_device(
        device: &ca::Device,
        direction: AudioDirection,
        default_device_id: Option<u32>,
    ) -> Option<AudioDevice> {
        let scope = match direction {
            AudioDirection::Input => ca::PropScope::INPUT,
            AudioDirection::Output => ca::PropScope::OUTPUT,
        };

        if !Self::has_streams(device, scope) {
            return None;
        }

        let uid = device.uid().ok()?;
        let name = device.name().ok()?;
        let transport_type = device
            .transport_type()
            .map(Self::ca_transport_to_transport_type)
            .unwrap_or(TransportType::Unknown);

        let is_default = default_device_id
            .map(|id| device.0.0 == id)
            .unwrap_or(false);

        Some(AudioDevice {
            id: DeviceId::new(uid.to_string()),
            name: name.to_string(),
            direction,
            transport_type,
            is_default,
        })
    }
}

impl AudioDeviceBackend for MacOSBackend {
    fn list_devices(&self) -> Result<Vec<AudioDevice>, Error> {
        let ca_devices =
            ca::System::devices().map_err(|e| Error::EnumerationFailed(format!("{:?}", e)))?;

        let default_input_id = ca::System::default_input_device().ok().map(|d| d.0.0);
        let default_output_id = ca::System::default_output_device().ok().map(|d| d.0.0);

        let mut devices = Vec::new();

        for ca_device in ca_devices {
            if let Some(input_device) =
                Self::create_audio_device(&ca_device, AudioDirection::Input, default_input_id)
            {
                devices.push(input_device);
            }

            if let Some(output_device) =
                Self::create_audio_device(&ca_device, AudioDirection::Output, default_output_id)
            {
                devices.push(output_device);
            }
        }

        Ok(devices)
    }

    fn get_default_input_device(&self) -> Result<Option<AudioDevice>, Error> {
        let ca_device = match ca::System::default_input_device() {
            Ok(d) => d,
            Err(_) => return Ok(None),
        };

        if ca_device.is_unknown() {
            return Ok(None);
        }

        Ok(Self::create_audio_device(
            &ca_device,
            AudioDirection::Input,
            Some(ca_device.0.0),
        ))
    }

    fn get_default_output_device(&self) -> Result<Option<AudioDevice>, Error> {
        let ca_device = match ca::System::default_output_device() {
            Ok(d) => d,
            Err(_) => return Ok(None),
        };

        if ca_device.is_unknown() {
            return Ok(None);
        }

        Ok(Self::create_audio_device(
            &ca_device,
            AudioDirection::Output,
            Some(ca_device.0.0),
        ))
    }

    fn set_default_input_device(&self, device_id: &DeviceId) -> Result<(), Error> {
        let uid = cf::String::from_str(device_id.as_str());
        let ca_device = ca::Device::with_uid(&uid)
            .map_err(|e| Error::DeviceNotFound(format!("{}: {:?}", device_id, e)))?;

        if ca_device.is_unknown() {
            return Err(Error::DeviceNotFound(device_id.to_string()));
        }

        ca::System::OBJ
            .set_prop(
                &ca::PropSelector::HW_DEFAULT_INPUT_DEVICE.global_addr(),
                &ca_device.0,
            )
            .map_err(|e| Error::SetDefaultFailed(format!("{:?}", e)))?;

        Ok(())
    }

    fn set_default_output_device(&self, device_id: &DeviceId) -> Result<(), Error> {
        let uid = cf::String::from_str(device_id.as_str());
        let ca_device = ca::Device::with_uid(&uid)
            .map_err(|e| Error::DeviceNotFound(format!("{}: {:?}", device_id, e)))?;

        if ca_device.is_unknown() {
            return Err(Error::DeviceNotFound(device_id.to_string()));
        }

        ca::System::OBJ
            .set_prop(
                &ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE.global_addr(),
                &ca_device.0,
            )
            .map_err(|e| Error::SetDefaultFailed(format!("{:?}", e)))?;

        Ok(())
    }

    fn is_headphone(&self, device: &AudioDevice) -> bool {
        if device.direction != AudioDirection::Output {
            return false;
        }

        match device.transport_type {
            TransportType::Bluetooth => true,
            TransportType::Usb => {
                let name_lower = device.name.to_lowercase();
                name_lower.contains("headphone")
                    || name_lower.contains("headset")
                    || name_lower.contains("airpod")
                    || name_lower.contains("earbud")
            }
            TransportType::BuiltIn => {
                let name_lower = device.name.to_lowercase();
                name_lower.contains("headphone")
            }
            _ => false,
        }
    }

    fn get_output_volume(&self) -> Result<f32, Error> {
        let ca_device = ca::System::default_output_device()
            .map_err(|e| Error::GetDefaultFailed(format!("{:?}", e)))?;

        if ca_device.is_unknown() {
            return Err(Error::DeviceNotFound(
                "No default output device".to_string(),
            ));
        }

        self.get_device_volume(&ca_device)
    }

    fn get_device_volume(&self, device: &ca::Device) -> Result<f32, Error> {
        let addr = ca::PropAddress {
            selector: ca::PropSelector::HW_VIRTUAL_MAIN_VOLUME,
            scope: ca::PropScope::OUTPUT,
            element: ca::PropElement::MAIN,
        };

        let volume: f32 = device
            .prop(&addr)
            .map_err(|e| Error::AudioSystemError(format!("Failed to get volume: {:?}", e)))?;

        Ok(volume)
    }

    fn set_output_volume(&self, volume: f32) -> Result<(), Error> {
        let ca_device = ca::System::default_output_device()
            .map_err(|e| Error::GetDefaultFailed(format!("{:?}", e)))?;

        if ca_device.is_unknown() {
            return Err(Error::DeviceNotFound(
                "No default output device".to_string(),
            ));
        }

        self.set_device_volume(&ca_device, volume)
    }

    fn set_device_volume(&self, device: &ca::Device, volume: f32) -> Result<(), Error> {
        let clamped_volume = volume.clamp(0.0, 1.0);

        let addr = ca::PropAddress {
            selector: ca::PropSelector::HW_VIRTUAL_MAIN_VOLUME,
            scope: ca::PropScope::OUTPUT,
            element: ca::PropElement::MAIN,
        };

        device
            .set_prop(&addr, &clamped_volume)
            .map_err(|e| Error::SetDefaultFailed(format!("Failed to set volume: {:?}", e)))?;

        Ok(())
    }

    fn is_device_muted_internal(
        &self,
        device: &ca::Device,
        direction: AudioDirection,
    ) -> Result<bool, Error> {
        let scope = match direction {
            AudioDirection::Input => ca::PropScope::INPUT,
            AudioDirection::Output => ca::PropScope::OUTPUT,
        };

        let addr = ca::PropAddress {
            selector: ca::PropSelector::DEVICE_MUTE,
            scope,
            element: ca::PropElement::MAIN,
        };

        if let Ok(muted) = device.prop::<u32>(&addr) {
            if muted != 0 {
                return Ok(true);
            }
        }

        let addr_ch1 = ca::PropAddress {
            selector: ca::PropSelector::DEVICE_MUTE,
            scope,
            element: ca::PropElement(1),
        };

        if let Ok(muted) = device.prop::<u32>(&addr_ch1) {
            if muted != 0 {
                return Ok(true);
            }
        }

        if direction == AudioDirection::Output {
            if let Ok(volume) = self.get_device_volume(device) {
                if volume < 0.01 {
                    return Ok(true);
                }
            }
        }

        Ok(false)
    }

    fn is_device_muted(
        &self,
        device_id: &DeviceId,
        direction: AudioDirection,
    ) -> Result<bool, Error> {
        let uid = cf::String::from_str(device_id.as_str());
        let ca_device = ca::Device::with_uid(&uid)
            .map_err(|e| Error::DeviceNotFound(format!("{}: {:?}", device_id, e)))?;

        if ca_device.is_unknown() {
            return Err(Error::DeviceNotFound(device_id.to_string()));
        }

        self.is_device_muted_internal(&ca_device, direction)
    }

    fn is_default_output_muted(&self) -> Result<bool, Error> {
        let ca_device = ca::System::default_output_device()
            .map_err(|e| Error::GetDefaultFailed(format!("{:?}", e)))?;

        if ca_device.is_unknown() {
            return Ok(false);
        }

        self.is_device_muted_internal(&ca_device, AudioDirection::Output)
    }

    fn is_default_input_muted(&self) -> Result<bool, Error> {
        let ca_device = ca::System::default_input_device()
            .map_err(|e| Error::GetDefaultFailed(format!("{:?}", e)))?;

        if ca_device.is_unknown() {
            return Ok(false);
        }

        self.is_device_muted_internal(&ca_device, AudioDirection::Input)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_devices() {
        let backend = MacOSBackend;
        match backend.list_devices() {
            Ok(devices) => {
                println!("Found {} devices:", devices.len());
                for device in &devices {
                    println!(
                        "  - {} ({:?}, {:?}, uid={}, default={})",
                        device.name,
                        device.direction,
                        device.transport_type,
                        device.id.0,
                        device.is_default
                    );
                }
            }
            Err(e) => {
                println!("Error listing devices: {}", e);
            }
        }
    }

    #[test]
    fn test_get_default_devices() {
        let backend = MacOSBackend;

        match backend.get_default_input_device() {
            Ok(Some(device)) => {
                println!("Default input: {} ({})", device.name, device.id.0);
            }
            Ok(None) => {
                println!("No default input device");
            }
            Err(e) => {
                println!("Error getting default input: {}", e);
            }
        }

        match backend.get_default_output_device() {
            Ok(Some(device)) => {
                println!("Default output: {} ({})", device.name, device.id.0);
                println!("Is headphone: {}", backend.is_headphone(&device));
            }
            Ok(None) => {
                println!("No default output device");
            }
            Err(e) => {
                println!("Error getting default output: {}", e);
            }
        }
    }
}
