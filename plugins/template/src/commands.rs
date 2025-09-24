use crate::TemplatePluginExt;

#[tauri::command]
#[specta::specta]
pub async fn render<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    name: hypr_template::Template,
    ctx: serde_json::Map<String, serde_json::Value>,
) -> Result<String, String> {
    app.render(name, ctx)
}
