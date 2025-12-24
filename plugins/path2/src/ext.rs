use std::path::PathBuf;

use tauri::Manager;

pub struct Path2<'a, R: tauri::Runtime, M: Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: Manager<R>> Path2<'a, R, M> {
    pub fn base(&self) -> Result<PathBuf, crate::Error> {
        let bundle_id: &str = self.manager.config().identifier.as_ref();
        let data_dir = self
            .manager
            .path()
            .data_dir()
            .map_err(|e| crate::Error::Path(e.to_string()))?;

        let app_folder = if cfg!(debug_assertions) || bundle_id == "com.hyprnote.staging" {
            bundle_id
        } else {
            "hyprnote"
        };

        let path = data_dir.join(app_folder);
        std::fs::create_dir_all(&path)?;
        Ok(path)
    }
}

pub trait Path2PluginExt<R: tauri::Runtime> {
    fn path2(&self) -> Path2<'_, R, Self>
    where
        Self: Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: Manager<R>> Path2PluginExt<R> for T {
    fn path2(&self) -> Path2<'_, R, Self>
    where
        Self: Sized,
    {
        Path2 {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
