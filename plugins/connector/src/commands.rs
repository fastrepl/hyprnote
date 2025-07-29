use crate::{Connection, ConnectionLLM, ConnectionSTT, ConnectorPluginExt, StoreKey};

#[tauri::command]
#[specta::specta]
pub async fn list_custom_llm_models<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    app.list_custom_llm_models()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_custom_llm_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_custom_llm_model().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_custom_llm_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: String,
) -> Result<(), String> {
    app.set_custom_llm_model(model).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_custom_llm_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_custom_llm_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_custom_llm_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_custom_llm_enabled(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_custom_llm_connection<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<Connection>, String> {
    app.get_custom_llm_connection().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_custom_llm_connection<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    connection: Connection,
) -> Result<(), String> {
    app.set_custom_llm_connection(connection)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_local_llm_connection<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<ConnectionLLM, String> {
    app.get_local_llm_connection()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_llm_connection<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<ConnectionLLM, String> {
    app.get_llm_connection().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_stt_connection<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<ConnectionSTT, String> {
    app.get_stt_connection().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_openai_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    let store = app.connector_store();
    let v = store
        .get::<String>(StoreKey::OpenaiApiKey)
        .map_err(|e| e.to_string())?;
    Ok(v.unwrap_or_default())
}

#[tauri::command]
#[specta::specta]
pub async fn get_openrouter_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    let store = app.connector_store();
    let v = store
        .get::<String>(StoreKey::OpenrouterApiKey)
        .map_err(|e| e.to_string())?;
    Ok(v.unwrap_or_default())
}

#[tauri::command]
#[specta::specta]
pub async fn get_gemini_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    let store = app.connector_store();
    let v = store
        .get::<String>(StoreKey::GeminiApiKey)
        .map_err(|e| e.to_string())?;
    Ok(v.unwrap_or_default())
}

#[tauri::command]
#[specta::specta]
pub async fn set_openai_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    api_key: String,
) -> Result<(), String> {
    app.connector_store()
        .set(StoreKey::OpenaiApiKey, api_key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_openrouter_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    api_key: String,
) -> Result<(), String> {
    app.connector_store()
        .set(StoreKey::OpenrouterApiKey, api_key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_gemini_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    api_key: String,
) -> Result<(), String> {
    app.connector_store()
        .set(StoreKey::GeminiApiKey, api_key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_provider_source<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    let store = app.connector_store();
    let v = store
        .get::<String>(StoreKey::ProviderSource)
        .map_err(|e| e.to_string())?;
    Ok(v.unwrap_or_default())
}

#[tauri::command]
#[specta::specta]
pub async fn set_provider_source<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    source: String,
) -> Result<(), String> {
    app.connector_store()
        .set(StoreKey::ProviderSource, source)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_others_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    let store = app.connector_store();
    let v = store
        .get::<String>(StoreKey::OthersApiKey)
        .map_err(|e| e.to_string())?;
    Ok(v.unwrap_or_default())
}

#[tauri::command]
#[specta::specta]
pub async fn set_others_api_key<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    api_key: String,
) -> Result<(), String> {
    app.connector_store()
        .set(StoreKey::OthersApiKey, api_key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_others_api_base<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    let store = app.connector_store();
    let v = store
        .get::<String>(StoreKey::OthersApiBase)
        .map_err(|e| e.to_string())?;
    Ok(v.unwrap_or_default())
}

#[tauri::command]
#[specta::specta]
pub async fn set_others_api_base<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    api_base: String,
) -> Result<(), String> {
    app.connector_store()
        .set(StoreKey::OthersApiBase, api_base)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_others_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    let store = app.connector_store();
    let v = store
        .get::<String>(StoreKey::OthersModel)
        .map_err(|e| e.to_string())?;
    Ok(v.unwrap_or_default())
}

#[tauri::command]
#[specta::specta]
pub async fn set_others_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: String,
) -> Result<(), String> {
    app.connector_store()
        .set(StoreKey::OthersModel, model)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_openai_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: String,
) -> Result<(), String> {
    app.connector_store()
        .set(StoreKey::OpenaiModel, model)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_openai_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    let store = app.connector_store();
    let v = store
        .get::<String>(StoreKey::OpenaiModel)
        .map_err(|e| e.to_string())?;
    Ok(v.unwrap_or_default())
}

#[tauri::command]
#[specta::specta]
pub async fn set_gemini_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: String,
) -> Result<(), String> {
    app.connector_store()
        .set(StoreKey::GeminiModel, model)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_gemini_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    let store = app.connector_store();
    let v = store
        .get::<String>(StoreKey::GeminiModel)
        .map_err(|e| e.to_string())?;
    Ok(v.unwrap_or_default())
}

#[tauri::command]
#[specta::specta]
pub async fn set_openrouter_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    model: String,
) -> Result<(), String> {
    app.connector_store()
        .set(StoreKey::OpenrouterModel, model)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_openrouter_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    let store = app.connector_store();
    let v = store
        .get::<String>(StoreKey::OpenrouterModel)
        .map_err(|e| e.to_string())?;
    Ok(v.unwrap_or_default())
}
