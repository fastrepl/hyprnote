use tauri::command;

#[command]
pub(crate) async fn ping(payload: String) -> Result<String, String> {
    Ok(payload)
}
