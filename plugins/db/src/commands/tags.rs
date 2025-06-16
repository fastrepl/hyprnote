#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_all_tags(
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<Vec<hypr_db_user::Tag>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.list_all_tags().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_session_tags(
    state: tauri::State<'_, crate::ManagedState>,
    session_id: String,
) -> Result<Vec<hypr_db_user::Tag>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.list_session_tags(session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn assign_tag_to_session(
    state: tauri::State<'_, crate::ManagedState>,
    tag_id: String,
    session_id: String,
) -> Result<(), String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.assign_tag_to_session(tag_id, session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn unassign_tag_from_session(
    state: tauri::State<'_, crate::ManagedState>,
    tag_id: String,
    session_id: String,
) -> Result<(), String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.unassign_tag_from_session(tag_id, session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_tag(
    state: tauri::State<'_, crate::ManagedState>,
    tag: hypr_db_user::Tag,
) -> Result<hypr_db_user::Tag, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.upsert_tag(tag).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn delete_tag(
    state: tauri::State<'_, crate::ManagedState>,
    tag_id: String,
) -> Result<(), String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.delete_tag(tag_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn suggest_tags_for_session(
    state: tauri::State<'_, crate::ManagedState>,
    session_id: String,
) -> Result<Vec<String>, String> {
    use hypr_template::{render, PredefinedTemplate, Template};
    use serde_json::Value;

    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    // Get session content
    let session = db
        .get_session(hypr_db_user::GetSessionFilter::Id(session_id.clone()))
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Session not found")?;

    // Get user's historical tags
    let historical_tags = db.list_all_tags().await.map_err(|e| e.to_string())?;

    // Get current session tags
    let current_tags = db
        .list_session_tags(session_id)
        .await
        .map_err(|e| e.to_string())?;

    // Extract hashtags from content (simple regex approach)
    let hashtag_regex = regex::Regex::new(r"#(\w+)").unwrap();
    let existing_hashtags: Vec<String> = hashtag_regex
        .captures_iter(&session.raw_memo_html)
        .map(|cap| cap[1].to_string())
        .collect();

    // Prepare context for template
    let mut context = serde_json::Map::new();
    context.insert("title".to_string(), Value::String(session.title));
    context.insert("content".to_string(), Value::String(session.raw_memo_html));
    context.insert(
        "existing_hashtags".to_string(),
        Value::Array(existing_hashtags.into_iter().map(Value::String).collect()),
    );
    context.insert(
        "formal_tags".to_string(),
        Value::Array(
            current_tags
                .into_iter()
                .map(|t| Value::String(t.name))
                .collect(),
        ),
    );
    context.insert(
        "historical_tags".to_string(),
        Value::Array(
            historical_tags
                .into_iter()
                .map(|t| Value::String(t.name))
                .collect(),
        ),
    );

    // Create template environment
    let mut env = minijinja::Environment::new();
    hypr_template::init(&mut env);

    // Render system and user prompts
    let system_template = Template::Static(PredefinedTemplate::SuggestTagsSystem);
    let user_template = Template::Static(PredefinedTemplate::SuggestTagsUser);

    let system_prompt = render(&env, system_template, &context.clone())
        .map_err(|e| format!("Template error: {}", e))?;
    let user_prompt =
        render(&env, user_template, &context).map_err(|e| format!("Template error: {}", e))?;

    // Make LLM request
    let llm_response = make_llm_request(system_prompt, user_prompt)
        .await
        .map_err(|e| format!("LLM request failed: {}", e))?;

    // Parse JSON response
    let suggestions: Vec<String> = serde_json::from_str(&llm_response)
        .map_err(|e| format!("Failed to parse LLM response: {}", e))?;

    Ok(suggestions)
}

async fn make_llm_request(
    system_prompt: String,
    user_prompt: String,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    // For now, assume local LLM is running on default port
    // TODO: Get actual connection info from connector plugin
    let connection = "http://localhost:11435";

    // Make HTTP request to local LLM
    let client = reqwest::Client::new();
    let request_body = serde_json::json!({
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "stream": false,
        "model": "llama"
    });

    let response = client
        .post(&format!("{}/chat/completions", connection))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await?;

    let response_json: serde_json::Value = response.json().await?;

    let content = response_json
        .get("choices")
        .and_then(|choices| choices.get(0))
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_str())
        .ok_or("Invalid LLM response format")?;

    Ok(content.to_string())
}
