pub struct FsDb<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    #[allow(dead_code)]
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> FsDb<'a, R, M> {
    pub fn ping(
        &self,
        payload: crate::models::PingRequest,
    ) -> Result<crate::models::PingResponse, crate::Error> {
        Ok(crate::models::PingResponse {
            value: payload.value,
        })
    }
}

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
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
