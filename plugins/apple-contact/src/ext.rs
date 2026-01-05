pub struct AppleContact<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    _manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> AppleContact<'a, R, M> {
    #[cfg(target_os = "macos")]
    pub fn import(&self) -> Result<crate::ImportResult, crate::Error> {
        crate::import_contacts().ok_or(crate::Error::NoContactsAccess)
    }

    #[cfg(not(target_os = "macos"))]
    pub fn import(&self) -> Result<crate::ImportResult, crate::Error> {
        Err(crate::Error::NotSupported)
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
