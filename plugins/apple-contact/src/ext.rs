pub struct AppleContact<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    _manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> AppleContact<'a, R, M> {
    pub fn ping(&self) -> Result<String, crate::Error> {
        Ok("pong".to_string())
    }
}

pub trait AppleContactPluginExt<R: tauri::Runtime> {
    fn apple_contact(&self) -> AppleContact<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AppleContactPluginExt<R> for T {
    fn apple_contact(&self) -> AppleContact<'_, R, Self>
    where
        Self: Sized,
    {
        AppleContact {
            _manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
