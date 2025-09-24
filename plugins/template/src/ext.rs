pub trait TemplatePluginExt<R: tauri::Runtime> {
    fn render(
        &self,
        name: hypr_template::Template,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> Result<String, String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> TemplatePluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    fn render(
        &self,
        name: hypr_template::Template,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> Result<String, String> {
        hypr_template::render(name.into(), &ctx)
            .map(|s| s.trim().to_string())
            .map_err(|e| e.to_string())
    }
}
