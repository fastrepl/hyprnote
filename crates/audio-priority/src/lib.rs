//! Audio device priority management for Hyprnote.
//!
//! This crate provides cross-platform APIs for:
//! - Enumerating audio devices with stable identifiers
//! - Getting and setting system default audio devices
//! - Detecting device types (headphone vs speaker)
//! - Managing device priorities and auto-switching
//!
//! Platform support:
//! - macOS: CoreAudio via cidre
//! - Linux: PulseAudio via libpulse-binding
//! - Windows: WASAPI via windows crate

mod device;
mod error;
mod listener;
mod manager;
mod priority;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "windows")]
mod windows;

pub use device::*;
pub use error::*;
pub use listener::*;
pub use manager::*;
pub use priority::*;

/// Get the platform-specific backend for audio device management.
pub fn backend() -> impl AudioDeviceBackend {
    #[cfg(target_os = "macos")]
    {
        macos::MacOSBackend
    }

    #[cfg(target_os = "linux")]
    {
        linux::LinuxBackend
    }

    #[cfg(target_os = "windows")]
    {
        windows::WindowsBackend
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        compile_error!("Unsupported platform for audio-priority crate")
    }
}

/// Trait for platform-specific audio device management.
pub trait AudioDeviceBackend {
    /// List all available audio devices.
    fn list_devices(&self) -> Result<Vec<AudioDevice>, Error>;

    /// List input (microphone) devices only.
    fn list_input_devices(&self) -> Result<Vec<AudioDevice>, Error> {
        Ok(self
            .list_devices()?
            .into_iter()
            .filter(|d| d.direction == AudioDirection::Input)
            .collect())
    }

    /// List output (speaker/headphone) devices only.
    fn list_output_devices(&self) -> Result<Vec<AudioDevice>, Error> {
        Ok(self
            .list_devices()?
            .into_iter()
            .filter(|d| d.direction == AudioDirection::Output)
            .collect())
    }

    /// Get the current default input device.
    fn get_default_input_device(&self) -> Result<Option<AudioDevice>, Error>;

    /// Get the current default output device.
    fn get_default_output_device(&self) -> Result<Option<AudioDevice>, Error>;

    /// Set the default input device by its stable ID.
    fn set_default_input_device(&self, device_id: &DeviceId) -> Result<(), Error>;

    /// Set the default output device by its stable ID.
    fn set_default_output_device(&self, device_id: &DeviceId) -> Result<(), Error>;

    /// Check if a device is a headphone/headset based on its properties.
    fn is_headphone(&self, device: &AudioDevice) -> bool;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_devices() {
        let backend = backend();
        match backend.list_devices() {
            Ok(devices) => {
                println!("Found {} devices:", devices.len());
                for device in &devices {
                    println!(
                        "  - {} ({:?}, {:?}, uid={})",
                        device.name, device.direction, device.transport_type, device.id.0
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
        let backend = backend();

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
