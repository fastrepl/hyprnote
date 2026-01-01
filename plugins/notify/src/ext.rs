pub struct Notify<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Notify<'a, R, M> {
    pub fn ping(&self) -> Result<(), crate::Error> {
        Ok(())
    }
}

pub trait NotifyPluginExt<R: tauri::Runtime> {
    fn notify(&self) -> Notify<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> NotifyPluginExt<R> for T {
    fn notify(&self) -> Notify<'_, R, Self>
    where
        Self: Sized,
    {
        Notify {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
