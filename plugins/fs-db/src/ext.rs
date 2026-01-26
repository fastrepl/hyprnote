pub struct FsDb<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    _manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> FsDb<'a, R, M> {}

pub trait FsDbPluginExt<R: tauri::Runtime> {
    fn fs_db(&self) -> FsDb<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> FsDbPluginExt<R> for T {
    fn fs_db(&self) -> FsDb<'_, R, Self>
    where
        Self: Sized,
    {
        FsDb {
            _manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
