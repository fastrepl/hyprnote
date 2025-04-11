pub trait TemplatePluginExt<R: tauri::Runtime> {
    fn render(
        &self,
        name: impl Into<hypr_template::Template>,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> Result<String, String>;
    fn register_template(
        &self,
        name: impl Into<String>,
        template: impl Into<String>,
    ) -> Result<(), String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::TemplatePluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    fn render(
        &self,
        name: impl Into<hypr_template::Template>,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> Result<String, String> {
        let state = self.state::<crate::ManagedState>();

        {
            let guard = state.lock().unwrap();

            hypr_template::render(&guard.env, name.into(), &ctx)
                .map(|s| s.trim().to_string())
                .map_err(|e| e.to_string())
        }
    }

    #[tracing::instrument(skip_all)]
    fn register_template(
        &self,
        name: impl Into<String>,
        template: impl Into<String>,
    ) -> Result<(), String> {
        let state = self.state::<crate::ManagedState>();

        {
            let mut guard = state.lock().unwrap();
            guard
                .env
                .add_template_owned(name.into(), template.into())
                .map_err(|e| e.to_string())
        }
    }
}
