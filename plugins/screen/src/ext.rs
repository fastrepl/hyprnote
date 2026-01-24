pub struct Screen<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Screen<'a, R, M> {
    pub fn ping(&self) -> Result<String, crate::Error> {
        let _ = self.manager;
        Ok("pong".to_string())
    }
}

pub trait ScreenPluginExt<R: tauri::Runtime> {
    fn screen(&self) -> Screen<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ScreenPluginExt<R> for T {
    fn screen(&self) -> Screen<'_, R, Self>
    where
        Self: Sized,
    {
        Screen {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
