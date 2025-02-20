type MutableState = crate::Mutex<crate::State>;

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state, ctx))]
pub async fn render(
    state: tauri::State<'_, MutableState>,
    name: String,
    ctx: serde_json::Map<String, serde_json::Value>,
) -> Result<String, String> {
    let s = state.lock().unwrap();
    let tpl = s.env.get_template(&name).map_err(|e| e.to_string())?;
    let rendered = tpl.render(&ctx).map_err(|e| e.to_string())?;
    Ok(rendered)
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn register_template(
    state: tauri::State<'_, MutableState>,
    name: String,
    template: String,
) -> Result<(), String> {
    let mut s = state.lock().unwrap();

    s.env
        .add_template(
            Box::leak(name.into_boxed_str()),
            Box::leak(template.into_boxed_str()),
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}
