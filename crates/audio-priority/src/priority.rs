//! Priority management for audio devices.
//!
//! This module provides persistent storage and management of:
//! - Device priorities (separate for input, speaker, headphone)
//! - Device categories (speaker vs headphone)
//! - Hidden/ignored devices (per category)
//! - Known devices with last seen timestamps

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{AudioDevice, AudioDirection, OutputCategory};

/// A stored device with metadata for persistence.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct StoredDevice {
    pub uid: String,
    pub name: String,
    pub is_input: bool,
    pub last_seen: u64,
}

impl StoredDevice {
    pub fn new(uid: impl Into<String>, name: impl Into<String>, is_input: bool) -> Self {
        Self {
            uid: uid.into(),
            name: name.into(),
            is_input,
            last_seen: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        }
    }

    pub fn last_seen_relative(&self) -> String {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let interval = now.saturating_sub(self.last_seen);

        if interval < 60 {
            "now".to_string()
        } else if interval < 3600 {
            let mins = interval / 60;
            format!("{}m ago", mins)
        } else if interval < 86400 {
            let hours = interval / 3600;
            format!("{}h ago", hours)
        } else if interval < 604800 {
            let days = interval / 86400;
            format!("{}d ago", days)
        } else if interval < 2592000 {
            let weeks = interval / 604800;
            format!("{}w ago", weeks)
        } else {
            let months = interval / 2592000;
            format!("{}mo ago", months)
        }
    }

    pub fn update_last_seen(&mut self) {
        self.last_seen = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
    }
}

/// Persistent state for priority management.
#[derive(Debug, Clone, Default, Serialize, Deserialize, specta::Type)]
pub struct PriorityState {
    pub input_priorities: Vec<String>,
    pub speaker_priorities: Vec<String>,
    pub headphone_priorities: Vec<String>,
    pub device_categories: HashMap<String, OutputCategory>,
    pub hidden_mics: Vec<String>,
    pub hidden_speakers: Vec<String>,
    pub hidden_headphones: Vec<String>,
    pub known_devices: Vec<StoredDevice>,
    pub current_mode: OutputCategory,
    pub is_custom_mode: bool,
}

/// Manager for device priorities and categories.
#[derive(Debug, Clone)]
pub struct PriorityManager {
    state: PriorityState,
}

impl Default for PriorityManager {
    fn default() -> Self {
        Self::new()
    }
}

impl PriorityManager {
    pub fn new() -> Self {
        Self {
            state: PriorityState::default(),
        }
    }

    pub fn from_state(state: PriorityState) -> Self {
        Self { state }
    }

    pub fn state(&self) -> &PriorityState {
        &self.state
    }

    pub fn into_state(self) -> PriorityState {
        self.state
    }

    pub fn current_mode(&self) -> OutputCategory {
        self.state.current_mode
    }

    pub fn set_current_mode(&mut self, mode: OutputCategory) {
        self.state.current_mode = mode;
    }

    pub fn is_custom_mode(&self) -> bool {
        self.state.is_custom_mode
    }

    pub fn set_custom_mode(&mut self, enabled: bool) {
        self.state.is_custom_mode = enabled;
    }

    pub fn get_known_devices(&self) -> &[StoredDevice] {
        &self.state.known_devices
    }

    pub fn remember_device(&mut self, uid: &str, name: &str, is_input: bool) {
        if let Some(device) = self.state.known_devices.iter_mut().find(|d| d.uid == uid) {
            device.name = name.to_string();
            device.update_last_seen();
        } else {
            self.state
                .known_devices
                .push(StoredDevice::new(uid, name, is_input));
        }
    }

    pub fn get_stored_device(&self, uid: &str) -> Option<&StoredDevice> {
        self.state.known_devices.iter().find(|d| d.uid == uid)
    }

    pub fn forget_device(&mut self, uid: &str) {
        self.state.known_devices.retain(|d| d.uid != uid);
        self.state.input_priorities.retain(|u| u != uid);
        self.state.speaker_priorities.retain(|u| u != uid);
        self.state.headphone_priorities.retain(|u| u != uid);
        self.state.hidden_mics.retain(|u| u != uid);
        self.state.hidden_speakers.retain(|u| u != uid);
        self.state.hidden_headphones.retain(|u| u != uid);
        self.state.device_categories.remove(uid);
    }

    pub fn get_category(&self, device: &AudioDevice) -> OutputCategory {
        self.state
            .device_categories
            .get(device.id.as_str())
            .copied()
            .unwrap_or(OutputCategory::Speaker)
    }

    pub fn set_category(&mut self, device: &AudioDevice, category: OutputCategory) {
        self.state
            .device_categories
            .insert(device.id.as_str().to_string(), category);
    }

    pub fn is_hidden(&self, device: &AudioDevice) -> bool {
        let uid = device.id.as_str();
        match device.direction {
            AudioDirection::Input => self.state.hidden_mics.contains(&uid.to_string()),
            AudioDirection::Output => {
                let category = self.get_category(device);
                match category {
                    OutputCategory::Speaker => {
                        self.state.hidden_speakers.contains(&uid.to_string())
                    }
                    OutputCategory::Headphone => {
                        self.state.hidden_headphones.contains(&uid.to_string())
                    }
                }
            }
        }
    }

    pub fn is_hidden_in_category(&self, device: &AudioDevice, category: OutputCategory) -> bool {
        let uid = device.id.as_str();
        match category {
            OutputCategory::Speaker => self.state.hidden_speakers.contains(&uid.to_string()),
            OutputCategory::Headphone => self.state.hidden_headphones.contains(&uid.to_string()),
        }
    }

    pub fn hide_device(&mut self, device: &AudioDevice) {
        let uid = device.id.as_str().to_string();
        match device.direction {
            AudioDirection::Input => {
                if !self.state.hidden_mics.contains(&uid) {
                    self.state.hidden_mics.push(uid);
                }
            }
            AudioDirection::Output => {
                let category = self.get_category(device);
                self.hide_device_in_category(device, category);
            }
        }
    }

    pub fn hide_device_in_category(&mut self, device: &AudioDevice, category: OutputCategory) {
        let uid = device.id.as_str().to_string();
        let hidden_list = match category {
            OutputCategory::Speaker => &mut self.state.hidden_speakers,
            OutputCategory::Headphone => &mut self.state.hidden_headphones,
        };
        if !hidden_list.contains(&uid) {
            hidden_list.push(uid);
        }
    }

    pub fn hide_device_entirely(&mut self, device: &AudioDevice) {
        let uid = device.id.as_str().to_string();
        if !self.state.hidden_speakers.contains(&uid) {
            self.state.hidden_speakers.push(uid.clone());
        }
        if !self.state.hidden_headphones.contains(&uid) {
            self.state.hidden_headphones.push(uid);
        }
    }

    pub fn unhide_device(&mut self, device: &AudioDevice) {
        let uid = device.id.as_str();
        match device.direction {
            AudioDirection::Input => {
                self.state.hidden_mics.retain(|u| u != uid);
            }
            AudioDirection::Output => {
                let category = self.get_category(device);
                self.unhide_device_from_category(device, category);
            }
        }
    }

    pub fn unhide_device_from_category(&mut self, device: &AudioDevice, category: OutputCategory) {
        let uid = device.id.as_str();
        let hidden_list = match category {
            OutputCategory::Speaker => &mut self.state.hidden_speakers,
            OutputCategory::Headphone => &mut self.state.hidden_headphones,
        };
        hidden_list.retain(|u| u != uid);
    }

    pub fn sort_by_priority(
        &self,
        devices: &[AudioDevice],
        direction: AudioDirection,
    ) -> Vec<AudioDevice> {
        let priorities = match direction {
            AudioDirection::Input => &self.state.input_priorities,
            AudioDirection::Output => &self.state.speaker_priorities,
        };
        self.sort_devices_by_priorities(devices, priorities)
    }

    pub fn sort_by_priority_category(
        &self,
        devices: &[AudioDevice],
        category: OutputCategory,
    ) -> Vec<AudioDevice> {
        let priorities = match category {
            OutputCategory::Speaker => &self.state.speaker_priorities,
            OutputCategory::Headphone => &self.state.headphone_priorities,
        };
        self.sort_devices_by_priorities(devices, priorities)
    }

    fn sort_devices_by_priorities(
        &self,
        devices: &[AudioDevice],
        priorities: &[String],
    ) -> Vec<AudioDevice> {
        let mut sorted = devices.to_vec();
        sorted.sort_by(|a, b| {
            let index_a = priorities
                .iter()
                .position(|u| u == a.id.as_str())
                .unwrap_or(usize::MAX);
            let index_b = priorities
                .iter()
                .position(|u| u == b.id.as_str())
                .unwrap_or(usize::MAX);
            index_a.cmp(&index_b)
        });
        sorted
    }

    pub fn save_priorities(&mut self, devices: &[AudioDevice], direction: AudioDirection) {
        let uids: Vec<String> = devices.iter().map(|d| d.id.as_str().to_string()).collect();
        match direction {
            AudioDirection::Input => self.state.input_priorities = uids,
            AudioDirection::Output => self.state.speaker_priorities = uids,
        }
    }

    pub fn save_priorities_category(&mut self, devices: &[AudioDevice], category: OutputCategory) {
        let uids: Vec<String> = devices.iter().map(|d| d.id.as_str().to_string()).collect();
        match category {
            OutputCategory::Speaker => self.state.speaker_priorities = uids,
            OutputCategory::Headphone => self.state.headphone_priorities = uids,
        }
    }

    pub fn move_device_to_top(&mut self, device: &AudioDevice) {
        let uid = device.id.as_str().to_string();
        match device.direction {
            AudioDirection::Input => {
                self.state.input_priorities.retain(|u| u != &uid);
                self.state.input_priorities.insert(0, uid);
            }
            AudioDirection::Output => {
                let category = self.get_category(device);
                match category {
                    OutputCategory::Speaker => {
                        self.state.speaker_priorities.retain(|u| u != &uid);
                        self.state.speaker_priorities.insert(0, uid);
                    }
                    OutputCategory::Headphone => {
                        self.state.headphone_priorities.retain(|u| u != &uid);
                        self.state.headphone_priorities.insert(0, uid);
                    }
                }
            }
        }
    }

    pub fn get_highest_priority_device<'a>(
        &self,
        devices: &'a [AudioDevice],
        direction: AudioDirection,
    ) -> Option<&'a AudioDevice> {
        let sorted = self.sort_by_priority(devices, direction);
        sorted
            .into_iter()
            .next()
            .and_then(|d| devices.iter().find(|dev| dev.id == d.id))
    }

    pub fn get_highest_priority_device_category<'a>(
        &self,
        devices: &'a [AudioDevice],
        category: OutputCategory,
    ) -> Option<&'a AudioDevice> {
        let sorted = self.sort_by_priority_category(devices, category);
        sorted
            .into_iter()
            .next()
            .and_then(|d| devices.iter().find(|dev| dev.id == d.id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{DeviceId, TransportType};

    fn make_device(id: &str, name: &str, direction: AudioDirection) -> AudioDevice {
        AudioDevice {
            id: DeviceId::new(id),
            name: name.to_string(),
            direction,
            transport_type: TransportType::Unknown,
            is_default: false,
        }
    }

    #[test]
    fn test_remember_device() {
        let mut manager = PriorityManager::new();
        manager.remember_device("uid1", "Device 1", true);

        let stored = manager.get_stored_device("uid1");
        assert!(stored.is_some());
        assert_eq!(stored.unwrap().name, "Device 1");
        assert!(stored.unwrap().is_input);
    }

    #[test]
    fn test_forget_device() {
        let mut manager = PriorityManager::new();
        manager.remember_device("uid1", "Device 1", true);
        manager.forget_device("uid1");

        assert!(manager.get_stored_device("uid1").is_none());
    }

    #[test]
    fn test_device_category() {
        let mut manager = PriorityManager::new();
        let device = make_device("uid1", "Device 1", AudioDirection::Output);

        assert_eq!(manager.get_category(&device), OutputCategory::Speaker);

        manager.set_category(&device, OutputCategory::Headphone);
        assert_eq!(manager.get_category(&device), OutputCategory::Headphone);
    }

    #[test]
    fn test_hide_unhide_device() {
        let mut manager = PriorityManager::new();
        let device = make_device("uid1", "Device 1", AudioDirection::Input);

        assert!(!manager.is_hidden(&device));

        manager.hide_device(&device);
        assert!(manager.is_hidden(&device));

        manager.unhide_device(&device);
        assert!(!manager.is_hidden(&device));
    }

    #[test]
    fn test_sort_by_priority() {
        let mut manager = PriorityManager::new();
        let device1 = make_device("uid1", "Device 1", AudioDirection::Input);
        let device2 = make_device("uid2", "Device 2", AudioDirection::Input);
        let device3 = make_device("uid3", "Device 3", AudioDirection::Input);

        let devices = vec![device1.clone(), device2.clone(), device3.clone()];

        manager.save_priorities(
            &[device3.clone(), device1.clone(), device2.clone()],
            AudioDirection::Input,
        );

        let sorted = manager.sort_by_priority(&devices, AudioDirection::Input);
        assert_eq!(sorted[0].id.as_str(), "uid3");
        assert_eq!(sorted[1].id.as_str(), "uid1");
        assert_eq!(sorted[2].id.as_str(), "uid2");
    }

    #[test]
    fn test_move_device_to_top() {
        let mut manager = PriorityManager::new();
        let device1 = make_device("uid1", "Device 1", AudioDirection::Input);
        let device2 = make_device("uid2", "Device 2", AudioDirection::Input);

        manager.save_priorities(&[device1.clone(), device2.clone()], AudioDirection::Input);
        manager.move_device_to_top(&device2);

        let devices = vec![device1.clone(), device2.clone()];
        let sorted = manager.sort_by_priority(&devices, AudioDirection::Input);
        assert_eq!(sorted[0].id.as_str(), "uid2");
    }
}
