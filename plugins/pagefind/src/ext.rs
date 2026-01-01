pub struct Pagefind<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Pagefind<'a, R, M> {
    pub async fn search(&self, _query: String) -> Result<Vec<String>, crate::Error> {
        Ok(vec![])
    }

    pub async fn index(&self, _content: String) -> Result<(), crate::Error> {
        Ok(())
    }
}

pub trait PagefindPluginExt<R: tauri::Runtime> {
    fn pagefind(&self) -> Pagefind<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> PagefindPluginExt<R> for T {
    fn pagefind(&self) -> Pagefind<'_, R, Self>
    where
        Self: Sized,
    {
        Pagefind {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
