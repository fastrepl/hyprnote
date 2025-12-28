//! macOS CoreAudio backend for audio device management.
//!
//! NOTE: This backend is currently stubbed out due to cidre API incompatibilities.
//! The implementation needs to be updated to match the current cidre version.

use crate::{AudioDevice, AudioDeviceBackend, DeviceId, Error};

pub struct MacOSBackend;

impl AudioDeviceBackend for MacOSBackend {
    fn list_devices(&self) -> Result<Vec<AudioDevice>, Error> {
        Err(Error::PlatformNotSupported(
            "macOS backend not yet implemented - cidre API update needed".to_string(),
        ))
    }

    fn get_default_input_device(&self) -> Result<Option<AudioDevice>, Error> {
        Err(Error::PlatformNotSupported(
            "macOS backend not yet implemented - cidre API update needed".to_string(),
        ))
    }

    fn get_default_output_device(&self) -> Result<Option<AudioDevice>, Error> {
        Err(Error::PlatformNotSupported(
            "macOS backend not yet implemented - cidre API update needed".to_string(),
        ))
    }

    fn set_default_input_device(&self, _device_id: &DeviceId) -> Result<(), Error> {
        Err(Error::PlatformNotSupported(
            "macOS backend not yet implemented - cidre API update needed".to_string(),
        ))
    }

    fn set_default_output_device(&self, _device_id: &DeviceId) -> Result<(), Error> {
        Err(Error::PlatformNotSupported(
            "macOS backend not yet implemented - cidre API update needed".to_string(),
        ))
    }

    fn is_headphone(&self, _device: &AudioDevice) -> bool {
        false
    }
}
