//! Audio priority manager for auto-switching devices.
//!
//! This module provides the main manager that:
//! - Tracks connected devices and their priorities
//! - Auto-switches to highest priority device on device changes
//! - Supports manual device selection and custom mode

use crate::{
    AudioDevice, AudioDeviceBackend, AudioDirection, DeviceId, OutputCategory, PriorityManager,
    PriorityState, backend,
};

/// Events that can be received by the audio priority manager.
#[derive(Debug, Clone)]
pub enum AudioPriorityEvent {
    /// Default input device changed
    DefaultInputChanged,
    /// Default output device changed
    DefaultOutputChanged { headphone: bool },
    /// Request to refresh device list
    RefreshDevices,
    /// Request to apply highest priority input device
    ApplyHighestPriorityInput,
    /// Request to apply highest priority output device
    ApplyHighestPriorityOutput,
}

/// Result of an auto-switch operation.
#[derive(Debug, Clone)]
pub struct SwitchResult {
    pub device: Option<AudioDevice>,
    pub switched: bool,
}

/// Audio priority manager that handles device switching.
pub struct AudioPriorityManager {
    priority_manager: PriorityManager,
    connected_input_devices: Vec<AudioDevice>,
    connected_output_devices: Vec<AudioDevice>,
    current_input_id: Option<DeviceId>,
    current_output_id: Option<DeviceId>,
}

impl Default for AudioPriorityManager {
    fn default() -> Self {
        Self::new()
    }
}

impl AudioPriorityManager {
    pub fn new() -> Self {
        Self {
            priority_manager: PriorityManager::new(),
            connected_input_devices: Vec::new(),
            connected_output_devices: Vec::new(),
            current_input_id: None,
            current_output_id: None,
        }
    }

    pub fn from_state(state: PriorityState) -> Self {
        Self {
            priority_manager: PriorityManager::from_state(state),
            connected_input_devices: Vec::new(),
            connected_output_devices: Vec::new(),
            current_input_id: None,
            current_output_id: None,
        }
    }

    pub fn priority_manager(&self) -> &PriorityManager {
        &self.priority_manager
    }

    pub fn priority_manager_mut(&mut self) -> &mut PriorityManager {
        &mut self.priority_manager
    }

    pub fn into_state(self) -> PriorityState {
        self.priority_manager.into_state()
    }

    pub fn current_mode(&self) -> OutputCategory {
        self.priority_manager.current_mode()
    }

    pub fn set_current_mode(&mut self, mode: OutputCategory) {
        self.priority_manager.set_current_mode(mode);
    }

    pub fn is_custom_mode(&self) -> bool {
        self.priority_manager.is_custom_mode()
    }

    pub fn set_custom_mode(&mut self, enabled: bool) {
        self.priority_manager.set_custom_mode(enabled);
    }

    pub fn connected_input_devices(&self) -> &[AudioDevice] {
        &self.connected_input_devices
    }

    pub fn connected_output_devices(&self) -> &[AudioDevice] {
        &self.connected_output_devices
    }

    pub fn current_input_id(&self) -> Option<&DeviceId> {
        self.current_input_id.as_ref()
    }

    pub fn current_output_id(&self) -> Option<&DeviceId> {
        self.current_output_id.as_ref()
    }

    /// Refresh the list of connected devices from the system.
    pub fn refresh_devices(&mut self) -> Result<(), crate::Error> {
        let backend = backend();
        let all_devices = backend.list_devices()?;

        // Update connected devices
        self.connected_input_devices = all_devices
            .iter()
            .filter(|d| d.direction == AudioDirection::Input)
            .cloned()
            .collect();

        self.connected_output_devices = all_devices
            .iter()
            .filter(|d| d.direction == AudioDirection::Output)
            .cloned()
            .collect();

        // Remember all connected devices
        for device in &all_devices {
            self.priority_manager.remember_device(
                device.id.as_str(),
                &device.name,
                device.direction == AudioDirection::Input,
            );
        }

        // Update current device IDs
        if let Ok(Some(input)) = backend.get_default_input_device() {
            self.current_input_id = Some(input.id);
        }
        if let Ok(Some(output)) = backend.get_default_output_device() {
            self.current_output_id = Some(output.id);
        }

        Ok(())
    }

    /// Get visible input devices (connected and not hidden), sorted by priority.
    pub fn get_visible_input_devices(&self) -> Vec<AudioDevice> {
        let visible: Vec<AudioDevice> = self
            .connected_input_devices
            .iter()
            .filter(|d| !self.priority_manager.is_hidden(d))
            .cloned()
            .collect();

        self.priority_manager
            .sort_by_priority(&visible, AudioDirection::Input)
    }

    /// Get visible speaker devices (connected and not hidden), sorted by priority.
    pub fn get_visible_speaker_devices(&self) -> Vec<AudioDevice> {
        let visible: Vec<AudioDevice> = self
            .connected_output_devices
            .iter()
            .filter(|d| {
                self.priority_manager.get_category(d) == OutputCategory::Speaker
                    && !self
                        .priority_manager
                        .is_hidden_in_category(d, OutputCategory::Speaker)
            })
            .cloned()
            .collect();

        self.priority_manager
            .sort_by_priority_category(&visible, OutputCategory::Speaker)
    }

    /// Get visible headphone devices (connected and not hidden), sorted by priority.
    pub fn get_visible_headphone_devices(&self) -> Vec<AudioDevice> {
        let visible: Vec<AudioDevice> = self
            .connected_output_devices
            .iter()
            .filter(|d| {
                self.priority_manager.get_category(d) == OutputCategory::Headphone
                    && !self
                        .priority_manager
                        .is_hidden_in_category(d, OutputCategory::Headphone)
            })
            .cloned()
            .collect();

        self.priority_manager
            .sort_by_priority_category(&visible, OutputCategory::Headphone)
    }

    /// Get active output devices based on current mode.
    pub fn get_active_output_devices(&self) -> Vec<AudioDevice> {
        match self.current_mode() {
            OutputCategory::Speaker => self.get_visible_speaker_devices(),
            OutputCategory::Headphone => self.get_visible_headphone_devices(),
        }
    }

    /// Apply the highest priority input device as the system default.
    pub fn apply_highest_priority_input(&mut self) -> Result<SwitchResult, crate::Error> {
        if self.is_custom_mode() {
            return Ok(SwitchResult {
                device: None,
                switched: false,
            });
        }

        let visible = self.get_visible_input_devices();
        if let Some(device) = visible.first() {
            let backend = backend();
            backend.set_default_input_device(&device.id)?;
            self.current_input_id = Some(device.id.clone());
            Ok(SwitchResult {
                device: Some(device.clone()),
                switched: true,
            })
        } else {
            Ok(SwitchResult {
                device: None,
                switched: false,
            })
        }
    }

    /// Apply the highest priority output device as the system default.
    pub fn apply_highest_priority_output(&mut self) -> Result<SwitchResult, crate::Error> {
        if self.is_custom_mode() {
            return Ok(SwitchResult {
                device: None,
                switched: false,
            });
        }

        let active = self.get_active_output_devices();
        if let Some(device) = active.first() {
            let backend = backend();
            backend.set_default_output_device(&device.id)?;
            self.current_output_id = Some(device.id.clone());
            Ok(SwitchResult {
                device: Some(device.clone()),
                switched: true,
            })
        } else {
            Ok(SwitchResult {
                device: None,
                switched: false,
            })
        }
    }

    /// Manually set the input device (also moves it to top priority if not in custom mode).
    pub fn set_input_device(&mut self, device: &AudioDevice) -> Result<(), crate::Error> {
        let backend = backend();
        backend.set_default_input_device(&device.id)?;
        self.current_input_id = Some(device.id.clone());

        if !self.is_custom_mode() {
            self.priority_manager.move_device_to_top(device);
        }

        Ok(())
    }

    /// Manually set the output device (also moves it to top priority if not in custom mode).
    pub fn set_output_device(&mut self, device: &AudioDevice) -> Result<(), crate::Error> {
        let backend = backend();
        backend.set_default_output_device(&device.id)?;
        self.current_output_id = Some(device.id.clone());

        if !self.is_custom_mode() {
            self.priority_manager.move_device_to_top(device);
        }

        Ok(())
    }

    /// Handle a device change event.
    pub fn handle_device_change(&mut self) -> Result<(), crate::Error> {
        self.refresh_devices()?;

        if !self.is_custom_mode() {
            self.apply_highest_priority_input()?;
            self.apply_highest_priority_output()?;
        }

        Ok(())
    }

    /// Toggle between speaker and headphone mode.
    pub fn toggle_mode(&mut self) -> Result<SwitchResult, crate::Error> {
        let new_mode = match self.current_mode() {
            OutputCategory::Speaker => OutputCategory::Headphone,
            OutputCategory::Headphone => OutputCategory::Speaker,
        };
        self.set_current_mode(new_mode);

        if !self.is_custom_mode() {
            self.apply_highest_priority_output()
        } else {
            Ok(SwitchResult {
                device: None,
                switched: false,
            })
        }
    }

    /// Set device category (speaker or headphone).
    pub fn set_device_category(
        &mut self,
        device: &AudioDevice,
        category: OutputCategory,
    ) -> Result<(), crate::Error> {
        self.priority_manager.set_category(device, category);

        if !self.is_custom_mode() && self.current_mode() == category {
            self.apply_highest_priority_output()?;
        }

        Ok(())
    }

    /// Hide a device from the current category.
    pub fn hide_device(&mut self, device: &AudioDevice) -> Result<(), crate::Error> {
        self.priority_manager.hide_device(device);

        if !self.is_custom_mode() {
            if device.direction == AudioDirection::Input {
                self.apply_highest_priority_input()?;
            } else {
                self.apply_highest_priority_output()?;
            }
        }

        Ok(())
    }

    /// Hide a device from a specific category.
    pub fn hide_device_in_category(
        &mut self,
        device: &AudioDevice,
        category: OutputCategory,
    ) -> Result<(), crate::Error> {
        self.priority_manager
            .hide_device_in_category(device, category);

        if !self.is_custom_mode() && self.current_mode() == category {
            self.apply_highest_priority_output()?;
        }

        Ok(())
    }

    /// Hide a device from both speaker and headphone categories.
    pub fn hide_device_entirely(&mut self, device: &AudioDevice) -> Result<(), crate::Error> {
        self.priority_manager.hide_device_entirely(device);

        if !self.is_custom_mode() {
            self.apply_highest_priority_output()?;
        }

        Ok(())
    }

    /// Unhide a device.
    pub fn unhide_device(&mut self, device: &AudioDevice) {
        self.priority_manager.unhide_device(device);
    }

    /// Unhide a device from a specific category.
    pub fn unhide_device_from_category(&mut self, device: &AudioDevice, category: OutputCategory) {
        self.priority_manager
            .unhide_device_from_category(device, category);
    }

    /// Move input device in priority list.
    pub fn move_input_device(
        &mut self,
        from_index: usize,
        to_index: usize,
    ) -> Result<(), crate::Error> {
        let mut devices = self.get_visible_input_devices();
        if from_index < devices.len() && to_index < devices.len() {
            let device = devices.remove(from_index);
            devices.insert(to_index, device);
            self.priority_manager
                .save_priorities(&devices, AudioDirection::Input);

            if !self.is_custom_mode() {
                self.apply_highest_priority_input()?;
            }
        }
        Ok(())
    }

    /// Move speaker device in priority list.
    pub fn move_speaker_device(
        &mut self,
        from_index: usize,
        to_index: usize,
    ) -> Result<(), crate::Error> {
        let mut devices = self.get_visible_speaker_devices();
        if from_index < devices.len() && to_index < devices.len() {
            let device = devices.remove(from_index);
            devices.insert(to_index, device);
            self.priority_manager
                .save_priorities_category(&devices, OutputCategory::Speaker);

            if !self.is_custom_mode() && self.current_mode() == OutputCategory::Speaker {
                self.apply_highest_priority_output()?;
            }
        }
        Ok(())
    }

    /// Move headphone device in priority list.
    pub fn move_headphone_device(
        &mut self,
        from_index: usize,
        to_index: usize,
    ) -> Result<(), crate::Error> {
        let mut devices = self.get_visible_headphone_devices();
        if from_index < devices.len() && to_index < devices.len() {
            let device = devices.remove(from_index);
            devices.insert(to_index, device);
            self.priority_manager
                .save_priorities_category(&devices, OutputCategory::Headphone);

            if !self.is_custom_mode() && self.current_mode() == OutputCategory::Headphone {
                self.apply_highest_priority_output()?;
            }
        }
        Ok(())
    }

    /// Check if a device is a headphone based on backend detection.
    pub fn is_headphone(&self, device: &AudioDevice) -> bool {
        let backend = backend();
        backend.is_headphone(device)
    }

    /// Auto-categorize output devices based on headphone detection.
    pub fn auto_categorize_devices(&mut self) {
        let backend = backend();
        for device in &self.connected_output_devices {
            if backend.is_headphone(device) {
                self.priority_manager
                    .set_category(device, OutputCategory::Headphone);
            } else {
                self.priority_manager
                    .set_category(device, OutputCategory::Speaker);
            }
        }
    }

    /// Get the volume for a device (0.0 to 1.0).
    pub fn get_device_volume(&self, device: &AudioDevice) -> Result<f32, crate::Error> {
        let backend = backend();
        backend.get_device_volume(&device.id)
    }

    /// Set the volume for a device (0.0 to 1.0).
    pub fn set_device_volume(
        &mut self,
        device: &AudioDevice,
        volume: f32,
    ) -> Result<(), crate::Error> {
        let backend = backend();
        backend.set_device_volume(&device.id, volume)
    }

    /// Check if a device is muted.
    pub fn is_device_muted(&self, device: &AudioDevice) -> Result<bool, crate::Error> {
        let backend = backend();
        backend.is_device_muted(&device.id)
    }

    /// Set the mute state for a device.
    pub fn set_device_mute(
        &mut self,
        device: &AudioDevice,
        muted: bool,
    ) -> Result<(), crate::Error> {
        let backend = backend();
        backend.set_device_mute(&device.id, muted)
    }

    /// Get the current default output device's volume.
    pub fn get_current_output_volume(&self) -> Result<f32, crate::Error> {
        let backend = backend();
        if let Some(device) = backend.get_default_output_device()? {
            backend.get_device_volume(&device.id)
        } else {
            Err(crate::Error::AudioSystemError(
                "No default output device".into(),
            ))
        }
    }

    /// Set the current default output device's volume.
    pub fn set_current_output_volume(&mut self, volume: f32) -> Result<(), crate::Error> {
        let backend = backend();
        if let Some(device) = backend.get_default_output_device()? {
            backend.set_device_volume(&device.id, volume)
        } else {
            Err(crate::Error::AudioSystemError(
                "No default output device".into(),
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_manager() {
        let manager = AudioPriorityManager::new();
        assert_eq!(manager.current_mode(), OutputCategory::Speaker);
        assert!(!manager.is_custom_mode());
    }

    #[test]
    fn test_toggle_mode() {
        let mut manager = AudioPriorityManager::new();
        manager.set_custom_mode(true); // Avoid actual device switching

        assert_eq!(manager.current_mode(), OutputCategory::Speaker);
        let _ = manager.toggle_mode();
        assert_eq!(manager.current_mode(), OutputCategory::Headphone);
        let _ = manager.toggle_mode();
        assert_eq!(manager.current_mode(), OutputCategory::Speaker);
    }

    #[test]
    fn test_custom_mode() {
        let mut manager = AudioPriorityManager::new();
        assert!(!manager.is_custom_mode());

        manager.set_custom_mode(true);
        assert!(manager.is_custom_mode());

        manager.set_custom_mode(false);
        assert!(!manager.is_custom_mode());
    }
}
