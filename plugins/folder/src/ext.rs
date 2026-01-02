pub struct Folder<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Folder<'a, R, M> {
    pub fn ping(&self) -> Result<String, crate::Error> {
        Ok("pong".to_string())
    }
}

pub trait FolderPluginExt<R: tauri::Runtime> {
    fn folder(&self) -> Folder<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> FolderPluginExt<R> for T {
    fn folder(&self) -> Folder<'_, R, Self>
    where
        Self: Sized,
    {
        Folder {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
