use std::path::Path;

pub struct Pdf<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    _manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Pdf<'a, R, M> {
    pub fn export(&self, path: &Path, input: crate::PdfInput) -> Result<(), crate::Error> {
        let typst_content = crate::typst_world::build_typst_content(&input);
        let pdf_bytes = crate::typst_world::compile_to_pdf(&typst_content)?;
        std::fs::write(path, pdf_bytes)?;
        Ok(())
    }
}

pub trait PdfPluginExt<R: tauri::Runtime> {
    fn pdf(&self) -> Pdf<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> PdfPluginExt<R> for T {
    fn pdf(&self) -> Pdf<'_, R, Self>
    where
        Self: Sized,
    {
        Pdf {
            _manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
