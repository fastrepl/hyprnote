use rayon::prelude::*;

pub fn tiptap_json_to_md(json: &serde_json::Value) -> Result<String, crate::Error> {
    let mdast = crate::tiptap_json_to_mdast(json);
    let md = crate::mdast_to_markdown(&mdast).map_err(crate::Error::Markdown)?;
    Ok(md)
}

pub fn tiptap_json_to_md_batch(items: Vec<serde_json::Value>) -> Result<Vec<String>, crate::Error> {
    items
        .into_par_iter()
        .map(|json| tiptap_json_to_md(&json))
        .collect()
}

pub struct Export<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    _manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Export<'a, R, M> {
    pub fn tiptap_json_to_md(&self, json: serde_json::Value) -> Result<String, crate::Error> {
        tiptap_json_to_md(&json)
    }

    pub fn tiptap_json_to_md_batch(
        &self,
        items: Vec<serde_json::Value>,
    ) -> Result<Vec<String>, crate::Error> {
        tiptap_json_to_md_batch(items)
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
            _manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
