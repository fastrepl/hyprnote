use std::path::PathBuf;

use tauri_plugin_path2::Path2PluginExt;

use hypr_audio_priority::{
    AudioDevice, AudioDeviceBackend, AudioDirection, DeviceId, OutputCategory, PriorityState,
    StoredDevice, backend,
};

pub const FILENAME: &str = "audio.json";

pub fn audio_priority_path<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<PathBuf, crate::Error> {
    let base = app.path2().base()?;
    Ok(base.join(FILENAME))
}

pub struct AudioPriority<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> AudioPriority<'a, R, M> {
    pub fn ping(&self) -> Result<String, crate::Error> {
        Ok("pong".to_string())
    }

    pub fn path(&self) -> Result<PathBuf, crate::Error> {
        audio_priority_path(self.manager.app_handle())
    }

    pub fn list_devices(&self) -> Result<Vec<AudioDevice>, crate::Error> {
        let backend = backend();
        backend.list_devices().map_err(Into::into)
    }

    pub fn list_input_devices(&self) -> Result<Vec<AudioDevice>, crate::Error> {
        let backend = backend();
        backend.list_input_devices().map_err(Into::into)
    }

    pub fn list_output_devices(&self) -> Result<Vec<AudioDevice>, crate::Error> {
        let backend = backend();
        backend.list_output_devices().map_err(Into::into)
    }

    pub fn get_default_input_device(&self) -> Result<Option<AudioDevice>, crate::Error> {
        let backend = backend();
        backend.get_default_input_device().map_err(Into::into)
    }

    pub fn get_default_output_device(&self) -> Result<Option<AudioDevice>, crate::Error> {
        let backend = backend();
        backend.get_default_output_device().map_err(Into::into)
    }

    pub fn set_default_input_device(&self, device_id: &str) -> Result<(), crate::Error> {
        let backend = backend();
        backend
            .set_default_input_device(&DeviceId::new(device_id))
            .map_err(Into::into)
    }

    pub fn set_default_output_device(&self, device_id: &str) -> Result<(), crate::Error> {
        let backend = backend();
        backend
            .set_default_output_device(&DeviceId::new(device_id))
            .map_err(Into::into)
    }

    pub fn is_headphone(&self, device: &AudioDevice) -> bool {
        let backend = backend();
        backend.is_headphone(device)
    }

    pub async fn load_state(&self) -> crate::Result<PriorityState> {
        let state = self.manager.state::<crate::state::AudioPriorityState>();
        state.load().await
    }

    pub async fn save_state(&self, priority_state: PriorityState) -> crate::Result<()> {
        let state = self.manager.state::<crate::state::AudioPriorityState>();
        state.save(priority_state).await
    }

    pub async fn get_input_priorities(&self) -> crate::Result<Vec<String>> {
        let state = self.load_state().await?;
        Ok(state.input_priorities)
    }

    pub async fn get_speaker_priorities(&self) -> crate::Result<Vec<String>> {
        let state = self.load_state().await?;
        Ok(state.speaker_priorities)
    }

    pub async fn get_headphone_priorities(&self) -> crate::Result<Vec<String>> {
        let state = self.load_state().await?;
        Ok(state.headphone_priorities)
    }

    pub async fn save_input_priorities(&self, priorities: Vec<String>) -> crate::Result<()> {
        let mut state = self.load_state().await?;
        state.input_priorities = priorities;
        self.save_state(state).await
    }

    pub async fn save_speaker_priorities(&self, priorities: Vec<String>) -> crate::Result<()> {
        let mut state = self.load_state().await?;
        state.speaker_priorities = priorities;
        self.save_state(state).await
    }

    pub async fn save_headphone_priorities(&self, priorities: Vec<String>) -> crate::Result<()> {
        let mut state = self.load_state().await?;
        state.headphone_priorities = priorities;
        self.save_state(state).await
    }

    pub async fn move_device_to_top(
        &self,
        device_id: &str,
        direction: AudioDirection,
        category: Option<OutputCategory>,
    ) -> crate::Result<()> {
        let mut state = self.load_state().await?;
        let uid = device_id.to_string();

        match direction {
            AudioDirection::Input => {
                state.input_priorities.retain(|u| u != &uid);
                state.input_priorities.insert(0, uid);
            }
            AudioDirection::Output => {
                let cat = category.unwrap_or_else(|| {
                    state
                        .device_categories
                        .get(device_id)
                        .copied()
                        .unwrap_or(OutputCategory::Speaker)
                });
                match cat {
                    OutputCategory::Speaker => {
                        state.speaker_priorities.retain(|u| u != &uid);
                        state.speaker_priorities.insert(0, uid);
                    }
                    OutputCategory::Headphone => {
                        state.headphone_priorities.retain(|u| u != &uid);
                        state.headphone_priorities.insert(0, uid);
                    }
                }
            }
        }

        self.save_state(state).await
    }

    pub async fn get_device_category(&self, device_id: &str) -> crate::Result<OutputCategory> {
        let state = self.load_state().await?;
        Ok(state
            .device_categories
            .get(device_id)
            .copied()
            .unwrap_or(OutputCategory::Speaker))
    }

    pub async fn set_device_category(
        &self,
        device_id: &str,
        category: OutputCategory,
    ) -> crate::Result<()> {
        let mut state = self.load_state().await?;
        state
            .device_categories
            .insert(device_id.to_string(), category);
        self.save_state(state).await
    }

    pub async fn get_current_mode(&self) -> crate::Result<OutputCategory> {
        let state = self.load_state().await?;
        Ok(state.current_mode)
    }

    pub async fn set_current_mode(&self, mode: OutputCategory) -> crate::Result<()> {
        let mut state = self.load_state().await?;
        state.current_mode = mode;
        self.save_state(state).await
    }

    pub async fn is_custom_mode(&self) -> crate::Result<bool> {
        let state = self.load_state().await?;
        Ok(state.is_custom_mode)
    }

    pub async fn set_custom_mode(&self, enabled: bool) -> crate::Result<()> {
        let mut state = self.load_state().await?;
        state.is_custom_mode = enabled;
        self.save_state(state).await
    }

    pub async fn get_known_devices(&self) -> crate::Result<Vec<StoredDevice>> {
        let state = self.load_state().await?;
        Ok(state.known_devices)
    }

    pub async fn remember_device(
        &self,
        uid: &str,
        name: &str,
        is_input: bool,
    ) -> crate::Result<()> {
        let mut state = self.load_state().await?;

        if let Some(device) = state.known_devices.iter_mut().find(|d| d.uid == uid) {
            device.name = name.to_string();
            device.update_last_seen();
        } else {
            state
                .known_devices
                .push(StoredDevice::new(uid, name, is_input));
        }

        self.save_state(state).await
    }

    pub async fn forget_device(&self, uid: &str) -> crate::Result<()> {
        let mut state = self.load_state().await?;
        state.known_devices.retain(|d| d.uid != uid);
        state.input_priorities.retain(|u| u != uid);
        state.speaker_priorities.retain(|u| u != uid);
        state.headphone_priorities.retain(|u| u != uid);
        state.hidden_mics.retain(|u| u != uid);
        state.hidden_speakers.retain(|u| u != uid);
        state.hidden_headphones.retain(|u| u != uid);
        state.device_categories.remove(uid);
        self.save_state(state).await
    }

    pub async fn is_device_hidden(
        &self,
        device_id: &str,
        direction: AudioDirection,
    ) -> crate::Result<bool> {
        let state = self.load_state().await?;
        let uid = device_id.to_string();

        match direction {
            AudioDirection::Input => Ok(state.hidden_mics.contains(&uid)),
            AudioDirection::Output => {
                let category = state
                    .device_categories
                    .get(device_id)
                    .copied()
                    .unwrap_or(OutputCategory::Speaker);
                match category {
                    OutputCategory::Speaker => Ok(state.hidden_speakers.contains(&uid)),
                    OutputCategory::Headphone => Ok(state.hidden_headphones.contains(&uid)),
                }
            }
        }
    }

    pub async fn hide_device(
        &self,
        device_id: &str,
        direction: AudioDirection,
    ) -> crate::Result<()> {
        let mut state = self.load_state().await?;
        let uid = device_id.to_string();

        match direction {
            AudioDirection::Input => {
                if !state.hidden_mics.contains(&uid) {
                    state.hidden_mics.push(uid);
                }
            }
            AudioDirection::Output => {
                let category = state
                    .device_categories
                    .get(device_id)
                    .copied()
                    .unwrap_or(OutputCategory::Speaker);
                match category {
                    OutputCategory::Speaker => {
                        if !state.hidden_speakers.contains(&uid) {
                            state.hidden_speakers.push(uid);
                        }
                    }
                    OutputCategory::Headphone => {
                        if !state.hidden_headphones.contains(&uid) {
                            state.hidden_headphones.push(uid);
                        }
                    }
                }
            }
        }

        self.save_state(state).await
    }

    pub async fn unhide_device(
        &self,
        device_id: &str,
        direction: AudioDirection,
    ) -> crate::Result<()> {
        let mut state = self.load_state().await?;
        let uid = device_id;

        match direction {
            AudioDirection::Input => {
                state.hidden_mics.retain(|u| u != uid);
            }
            AudioDirection::Output => {
                let category = state
                    .device_categories
                    .get(device_id)
                    .copied()
                    .unwrap_or(OutputCategory::Speaker);
                match category {
                    OutputCategory::Speaker => {
                        state.hidden_speakers.retain(|u| u != uid);
                    }
                    OutputCategory::Headphone => {
                        state.hidden_headphones.retain(|u| u != uid);
                    }
                }
            }
        }

        self.save_state(state).await
    }
}

pub trait AudioPriorityPluginExt<R: tauri::Runtime> {
    fn audio_priority(&self) -> AudioPriority<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AudioPriorityPluginExt<R> for T {
    fn audio_priority(&self) -> AudioPriority<'_, R, Self>
    where
        Self: Sized,
    {
        AudioPriority {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
