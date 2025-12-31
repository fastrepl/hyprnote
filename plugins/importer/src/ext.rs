use crate::output::to_tinybase_json;
use crate::sources::AnyImportSource;
use crate::types::{ImportSourceInfo, ImportSourceKind, ImportStats};
use tauri::path::BaseDirectory;

pub struct Importer<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Importer<'a, R, M> {
    pub fn list_available_sources(&self) -> Vec<ImportSourceInfo> {
        crate::sources::list_available_sources()
    }

    pub async fn run_import(
        &self,
        source_kind: ImportSourceKind,
        user_id: String,
    ) -> Result<ImportStats, crate::Error> {
        let source = AnyImportSource::from(source_kind.clone());

        if !source.is_available() {
            return Err(crate::Error::SourceNotFound(source_kind));
        }

        let data = source.import_all().await?;
        let stats = data.stats();

        let tinybase_json = to_tinybase_json(&data, &user_id);

        let dir_path = self
            .manager
            .path()
            .resolve("hyprnote", BaseDirectory::Data)?;
        std::fs::create_dir_all(&dir_path)?;
        let file_path = dir_path.join("import.json");

        let json_str = serde_json::to_string_pretty(&tinybase_json)?;
        std::fs::write(&file_path, json_str)?;

        Ok(stats)
    }

    pub async fn run_import_dry(
        &self,
        source_kind: ImportSourceKind,
    ) -> Result<ImportStats, crate::Error> {
        let source = AnyImportSource::from(source_kind.clone());

        if !source.is_available() {
            return Err(crate::Error::SourceNotFound(source_kind));
        }

        let data = source.import_all().await?;
        Ok(data.stats())
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
