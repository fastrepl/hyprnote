use std::path::Path;

pub struct Export<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Export<'a, R, M> {
    pub async fn export_tiptap_json_to_md(
        &self,
        json: serde_json::Value,
        path: impl AsRef<Path>,
    ) -> Result<(), crate::Error> {
        let mdast = crate::tiptap_json_to_mdast(&json);
        let md = crate::mdast_to_markdown(&mdast).map_err(crate::Error::Markdown)?;

        tokio::fs::write(path, md).await.map_err(crate::Error::Io)?;

        Ok(())
    }
}

pub trait ExportPluginExt<R: tauri::Runtime> {
    fn export(&self) -> Export<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ExportPluginExt<R> for T {
    fn export(&self) -> Export<'_, R, Self>
    where
        Self: Sized,
    {
        Export {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
