use crate::types::{ImportSourceInfo, ImportSourceKind};

pub struct Importer<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    #[allow(dead_code)]
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Importer<'a, R, M> {
    pub fn list_available_sources(&self) -> Vec<ImportSourceInfo> {
        crate::sources::list_available_sources()
    }

    pub async fn run_import(&self, _source: ImportSourceKind) -> crate::Result<()> {
        Ok(())
    }

    pub async fn run_import_dry(&self, _source: ImportSourceKind) -> crate::Result<()> {
        Ok(())
    }
}

pub trait ImporterPluginExt<R: tauri::Runtime> {
    fn importer(&self) -> Importer<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ImporterPluginExt<R> for T {
    fn importer(&self) -> Importer<'_, R, Self>
    where
        Self: Sized,
    {
        Importer {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
