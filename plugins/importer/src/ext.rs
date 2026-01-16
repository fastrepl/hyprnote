use crate::output::to_tinybase_json;
use crate::types::{ImportSource, ImportSourceInfo, ImportSourceKind, ImportStats};
use tauri_plugin_settings::SettingsPluginExt;

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
        let source = ImportSource::from(source_kind.clone());
        self.run_import_from_source(&source, user_id).await
    }

    pub async fn run_import_from_source(
        &self,
        source: &ImportSource,
        user_id: String,
    ) -> Result<ImportStats, crate::Error> {
        if !source.is_available() {
            return Err(crate::Error::SourceNotAvailable(source.name.clone()));
        }

        let data = crate::sources::import_all(source).await?;
        let stats = data.stats();

        let tinybase_json = to_tinybase_json(&data, &user_id);

        let dir_path = self.manager.settings().settings_base()?;
        let file_path = dir_path.join("import.json");

        let json_str = serde_json::to_string_pretty(&tinybase_json)?;
        std::fs::write(&file_path, json_str)?;

        Ok(stats)
    }

    pub async fn run_import_dry(
        &self,
        source_kind: ImportSourceKind,
    ) -> Result<ImportStats, crate::Error> {
        let source = ImportSource::from(source_kind.clone());
        self.run_import_dry_from_source(&source).await
    }

    pub async fn run_import_dry_from_source(
        &self,
        source: &ImportSource,
    ) -> Result<ImportStats, crate::Error> {
        if !source.is_available() {
            return Err(crate::Error::SourceNotAvailable(source.name.clone()));
        }

        let data = crate::sources::import_all(source).await?;
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
