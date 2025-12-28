pub struct AudioPriority<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> AudioPriority<'a, R, M> {
    pub fn ping(&self) -> Result<String, crate::Error> {
        Ok("pong".to_string())
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
