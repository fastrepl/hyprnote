use crate::TemplatePluginExt;

#[tauri::command]
#[specta::specta]
pub async fn render<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    name: String,
    ctx: serde_json::Map<String, serde_json::Value>,
) -> Result<String, String> {
    app.render(name, ctx)
}

#[tauri::command]
#[specta::specta]
pub async fn register_template<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    name: String,
    template: String,
) -> Result<(), String> {
    app.register_template(name, template)
}
