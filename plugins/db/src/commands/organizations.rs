#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_organizations(
    state: tauri::State<'_, crate::ManagedState>,
    filter: Option<hypr_db_user::ListOrganizationFilter>,
) -> Result<Vec<hypr_db_user::Organization>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.list_organizations(filter)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_organization(
    state: tauri::State<'_, crate::ManagedState>,
    id: String,
) -> Result<Option<hypr_db_user::Organization>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.get_organization(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_organization_by_user_id(
    state: tauri::State<'_, crate::ManagedState>,
    user_id: String,
) -> Result<Option<hypr_db_user::Organization>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.get_organization_by_user_id(user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_organization(
    state: tauri::State<'_, crate::ManagedState>,
    organization: hypr_db_user::Organization,
) -> Result<hypr_db_user::Organization, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.upsert_organization(organization)
        .await
        .map_err(|e| e.to_string())
}
