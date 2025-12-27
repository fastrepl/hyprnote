use crate::TemplatePluginExt;

#[tauri::command]
#[specta::specta]
pub async fn render<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    tpl: hypr_template_app::Template,
) -> Result<String, String> {
    app.template().render(tpl)
}

#[tauri::command]
#[specta::specta]
pub async fn render_custom<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    template_content: String,
    ctx: serde_json::Map<String, serde_json::Value>,
) -> Result<String, String> {
    app.template().render_custom(&template_content, ctx)
}
