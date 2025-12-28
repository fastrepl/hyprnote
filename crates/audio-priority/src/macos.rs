//! macOS CoreAudio backend for audio device management.

use crate::{AudioDevice, AudioDeviceBackend, AudioDirection, DeviceId, Error, TransportType};
use cidre::{core_audio as ca, io, os};

pub struct MacOSBackend;

impl MacOSBackend {
    fn get_all_devices() -> Result<Vec<ca::Device>, Error> {
        ca::System::devices().map_err(|e| Error::EnumerationFailed(format!("{:?}", e)))
    }

    fn get_device_uid(device: &ca::Device) -> Option<String> {
        const DEVICE_UID: ca::PropAddr = ca::PropAddr {
            selector: ca::PropSelector::DEVICE_UID,
            scope: ca::PropScope::GLOBAL,
            element: ca::PropElement::MAIN,
        };

        device
            .prop::<cidre::cf::String>(&DEVICE_UID)
            .ok()
            .map(|s| s.to_string())
    }

    fn get_device_name(device: &ca::Device) -> Option<String> {
        const DEVICE_NAME: ca::PropAddr = ca::PropAddr {
            selector: ca::PropSelector::OBJ_NAME,
            scope: ca::PropScope::GLOBAL,
            element: ca::PropElement::MAIN,
        };

        device
            .prop::<cidre::cf::String>(&DEVICE_NAME)
            .ok()
            .map(|s| s.to_string())
    }

    fn get_device_transport_type(device: &ca::Device) -> TransportType {
        const DEVICE_TRANSPORT_TYPE: ca::PropAddr = ca::PropAddr {
            selector: ca::PropSelector::DEVICE_TRANSPORT_TYPE,
            scope: ca::PropScope::GLOBAL,
            element: ca::PropElement::MAIN,
        };

        match device.prop::<u32>(&DEVICE_TRANSPORT_TYPE) {
            Ok(transport) => match ca::DeviceTransportType(transport) {
                ca::DeviceTransportType::BUILT_IN => TransportType::BuiltIn,
                ca::DeviceTransportType::USB => TransportType::Usb,
                ca::DeviceTransportType::BLUETOOTH => TransportType::Bluetooth,
                ca::DeviceTransportType::BLUETOOTH_LE => TransportType::Bluetooth,
                ca::DeviceTransportType::HDMI => TransportType::Hdmi,
                ca::DeviceTransportType::DISPLAY_PORT => TransportType::Hdmi,
                ca::DeviceTransportType::PCI => TransportType::Pci,
                ca::DeviceTransportType::VIRTUAL => TransportType::Virtual,
                ca::DeviceTransportType::AGGREGATE => TransportType::Virtual,
                _ => TransportType::Unknown,
            },
            Err(_) => TransportType::Unknown,
        }
    }

    fn has_input_streams(device: &ca::Device) -> bool {
        const INPUT_STREAMS: ca::PropAddr = ca::PropAddr {
            selector: ca::PropSelector::DEVICE_STREAMS,
            scope: ca::PropScope::INPUT,
            element: ca::PropElement::MAIN,
        };

        device
            .prop_size(&INPUT_STREAMS)
            .map(|size| size > 0)
            .unwrap_or(false)
    }

    fn has_output_streams(device: &ca::Device) -> bool {
        const OUTPUT_STREAMS: ca::PropAddr = ca::PropAddr {
            selector: ca::PropSelector::DEVICE_STREAMS,
            scope: ca::PropScope::OUTPUT,
            element: ca::PropElement::MAIN,
        };

        device
            .prop_size(&OUTPUT_STREAMS)
            .map(|size| size > 0)
            .unwrap_or(false)
    }

    fn is_headphone_device(device: &ca::Device) -> bool {
        match device.streams() {
            Ok(streams) => streams.iter().any(|s| {
                if let Ok(term_type) = s.terminal_type() {
                    term_type == ca::StreamTerminalType::HEADPHONES
                        || term_type == ca::StreamTerminalType::HEADSET_MIC
                        || term_type.0 == io::audio::output_term::HEADPHONES
                        || term_type.0 == io::audio::output_term::HEAD_MOUNTED_DISPLAY_AUDIO
                } else {
                    false
                }
            }),
            Err(_) => false,
        }
    }

    fn device_from_ca_device(
        device: &ca::Device,
        direction: AudioDirection,
        default_input_id: Option<&str>,
        default_output_id: Option<&str>,
    ) -> Option<AudioDevice> {
        let uid = Self::get_device_uid(device)?;
        let name = Self::get_device_name(device)?;
        let transport_type = Self::get_device_transport_type(device);

        let is_default = match direction {
            AudioDirection::Input => default_input_id.map(|id| id == uid).unwrap_or(false),
            AudioDirection::Output => default_output_id.map(|id| id == uid).unwrap_or(false),
        };

        Some(AudioDevice {
            id: DeviceId::new(uid),
            name,
            direction,
            transport_type,
            is_default,
        })
    }

    fn get_default_device_uid(selector: ca::PropSelector) -> Option<String> {
        let addr = ca::PropAddr {
            selector,
            scope: ca::PropScope::GLOBAL,
            element: ca::PropElement::MAIN,
        };

        let device_id: ca::DeviceId = ca::System::OBJ.prop(&addr).ok()?;
        let device = ca::Device::with_id(device_id).ok()?;
        Self::get_device_uid(&device)
    }

    fn set_default_device(selector: ca::PropSelector, device_uid: &str) -> Result<(), Error> {
        let devices = Self::get_all_devices()?;

        let target_device = devices.iter().find(|d| {
            Self::get_device_uid(d)
                .map(|uid| uid == device_uid)
                .unwrap_or(false)
        });

        let device = target_device.ok_or_else(|| Error::DeviceNotFound(device_uid.to_string()))?;

        let addr = ca::PropAddr {
            selector,
            scope: ca::PropScope::GLOBAL,
            element: ca::PropElement::MAIN,
        };

        let device_id = device.id();
        let data_size = std::mem::size_of::<ca::DeviceId>() as u32;

        let status = unsafe {
            cidre::core_audio::AudioObjectSetPropertyData(
                ca::System::OBJ.0,
                &addr as *const _ as *const _,
                0,
                std::ptr::null(),
                data_size,
                &device_id as *const _ as *const _,
            )
        };

        if status == os::Status::NO_ERR {
            Ok(())
        } else {
            Err(Error::SetDefaultFailed(format!(
                "CoreAudio error: {:?}",
                status
            )))
        }
    }
}

impl AudioDeviceBackend for MacOSBackend {
    fn list_devices(&self) -> Result<Vec<AudioDevice>, Error> {
        let devices = Self::get_all_devices()?;
        let default_input_uid =
            Self::get_default_device_uid(ca::PropSelector::HW_DEFAULT_INPUT_DEVICE);
        let default_output_uid =
            Self::get_default_device_uid(ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE);

        let mut result = Vec::new();

        for device in &devices {
            let has_input = Self::has_input_streams(device);
            let has_output = Self::has_output_streams(device);

            if has_input {
                if let Some(audio_device) = Self::device_from_ca_device(
                    device,
                    AudioDirection::Input,
                    default_input_uid.as_deref(),
                    default_output_uid.as_deref(),
                ) {
                    result.push(audio_device);
                }
            }

            if has_output {
                if let Some(audio_device) = Self::device_from_ca_device(
                    device,
                    AudioDirection::Output,
                    default_input_uid.as_deref(),
                    default_output_uid.as_deref(),
                ) {
                    result.push(audio_device);
                }
            }
        }

        Ok(result)
    }

    fn get_default_input_device(&self) -> Result<Option<AudioDevice>, Error> {
        let device = match ca::System::default_input_device() {
            Ok(d) => d,
            Err(_) => return Ok(None),
        };

        let default_input_uid = Self::get_device_uid(&device);

        Ok(Self::device_from_ca_device(
            &device,
            AudioDirection::Input,
            default_input_uid.as_deref(),
            None,
        ))
    }

    fn get_default_output_device(&self) -> Result<Option<AudioDevice>, Error> {
        let device = match ca::System::default_output_device() {
            Ok(d) => d,
            Err(_) => return Ok(None),
        };

        let default_output_uid = Self::get_device_uid(&device);

        Ok(Self::device_from_ca_device(
            &device,
            AudioDirection::Output,
            None,
            default_output_uid.as_deref(),
        ))
    }

    fn set_default_input_device(&self, device_id: &DeviceId) -> Result<(), Error> {
        Self::set_default_device(ca::PropSelector::HW_DEFAULT_INPUT_DEVICE, &device_id.0)
    }

    fn set_default_output_device(&self, device_id: &DeviceId) -> Result<(), Error> {
        Self::set_default_device(ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE, &device_id.0)
    }

    fn is_headphone(&self, device: &AudioDevice) -> bool {
        if device.direction != AudioDirection::Output {
            return false;
        }

        let devices = match Self::get_all_devices() {
            Ok(d) => d,
            Err(_) => return false,
        };

        for ca_device in &devices {
            if let Some(uid) = Self::get_device_uid(ca_device) {
                if uid == device.id.0 {
                    return Self::is_headphone_device(ca_device);
                }
            }
        }

        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_devices() {
        let backend = MacOSBackend;
        let devices = backend.list_devices().unwrap();
        println!("Found {} devices", devices.len());
        for device in &devices {
            println!(
                "  {} ({:?}, {:?}, uid={})",
                device.name, device.direction, device.transport_type, device.id.0
            );
        }
    }

    #[test]
    fn test_get_default_devices() {
        let backend = MacOSBackend;

        if let Ok(Some(device)) = backend.get_default_input_device() {
            println!("Default input: {} ({})", device.name, device.id.0);
        }

        if let Ok(Some(device)) = backend.get_default_output_device() {
            println!("Default output: {} ({})", device.name, device.id.0);
            println!("Is headphone: {}", backend.is_headphone(&device));
        }
    }
}
