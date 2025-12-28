use hypr_audio_priority::{AudioDevice, AudioDeviceBackend, DeviceId, backend};

pub struct AudioPriority<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> AudioPriority<'a, R, M> {
    pub fn ping(&self) -> Result<String, crate::Error> {
        Ok("pong".to_string())
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
