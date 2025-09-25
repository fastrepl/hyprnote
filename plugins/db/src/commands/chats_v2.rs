use hypr_db_user::{ChatConversation, ChatMessageV2};

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn create_conversation(
    state: tauri::State<'_, crate::ManagedState>,
    conversation: ChatConversation,
) -> Result<ChatConversation, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.create_conversation(conversation)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_conversations(
    state: tauri::State<'_, crate::ManagedState>,
    session_id: String,
) -> Result<Vec<ChatConversation>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.list_conversations(session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn create_message_v2(
    state: tauri::State<'_, crate::ManagedState>,
    message: ChatMessageV2,
) -> Result<ChatMessageV2, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.create_message_v2(message)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_messages_v2(
    state: tauri::State<'_, crate::ManagedState>,
    conversation_id: String,
) -> Result<Vec<ChatMessageV2>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.list_messages_v2(conversation_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn update_message_v2_parts(
    state: tauri::State<'_, crate::ManagedState>,
    id: String,
    parts: String,
) -> Result<(), String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.update_message_v2_parts(id, parts)
        .await
        .map_err(|e| e.to_string())
}
