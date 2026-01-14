pub struct Opener2<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Opener2<'a, R, M> {
    pub fn ping(&self) -> Result<String, crate::Error> {
        Ok("pong".to_string())
    }
}

pub trait Opener2PluginExt<R: tauri::Runtime> {
    fn opener2(&self) -> Opener2<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> Opener2PluginExt<R> for T {
    fn opener2(&self) -> Opener2<'_, R, Self>
    where
        Self: Sized,
    {
        Opener2 {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
