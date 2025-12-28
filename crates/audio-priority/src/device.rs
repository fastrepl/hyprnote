//! Audio device types and identifiers.

use serde::{Deserialize, Serialize};

/// A stable, platform-specific device identifier.
///
/// On macOS: CoreAudio device UID (e.g., "BuiltInMicrophoneDevice")
/// On Linux: PulseAudio source/sink name (e.g., "alsa_input.pci-0000_00_1f.3.analog-stereo")
/// On Windows: IMMDevice endpoint ID
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
pub struct DeviceId(pub String);

impl DeviceId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for DeviceId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Audio device direction (input or output).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
pub enum AudioDirection {
    /// Input device (microphone)
    Input,
    /// Output device (speaker/headphone)
    Output,
}

/// Transport type for audio devices.
///
/// Used to determine device category (headphone vs speaker) and priority.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
pub enum TransportType {
    /// Built-in device (internal speakers, internal mic)
    BuiltIn,
    /// USB audio device
    Usb,
    /// Bluetooth audio device
    Bluetooth,
    /// HDMI/DisplayPort audio
    Hdmi,
    /// PCI audio device
    Pci,
    /// Virtual/aggregate device
    Virtual,
    /// Unknown transport type
    Unknown,
}

/// Output device category for priority management.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
pub enum OutputCategory {
    /// Speaker devices (external speakers, built-in speakers)
    Speaker,
    /// Headphone/headset devices
    Headphone,
}

/// Represents an audio device with stable identification.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub struct AudioDevice {
    /// Stable, platform-specific device identifier
    pub id: DeviceId,
    /// Human-readable device name
    pub name: String,
    /// Device direction (input/output)
    pub direction: AudioDirection,
    /// Transport type (USB, Bluetooth, etc.)
    pub transport_type: TransportType,
    /// Whether this device is currently the system default
    pub is_default: bool,
}

impl AudioDevice {
    pub fn new(
        id: impl Into<String>,
        name: impl Into<String>,
        direction: AudioDirection,
        transport_type: TransportType,
    ) -> Self {
        Self {
            id: DeviceId::new(id),
            name: name.into(),
            direction,
            transport_type,
            is_default: false,
        }
    }

    pub fn with_default(mut self, is_default: bool) -> Self {
        self.is_default = is_default;
        self
    }
}
