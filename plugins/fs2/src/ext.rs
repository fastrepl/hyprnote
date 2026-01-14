pub struct Fs2<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    #[allow(dead_code)]
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Fs2<'a, R, M> {
    pub fn ping(&self) -> Result<String, crate::Error> {
        Ok("pong".to_string())
    }
}

pub trait Fs2PluginExt<R: tauri::Runtime> {
    fn fs2(&self) -> Fs2<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> Fs2PluginExt<R> for T {
    fn fs2(&self) -> Fs2<'_, R, Self>
    where
        Self: Sized,
    {
        Fs2 {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
