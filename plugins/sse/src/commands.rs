use reqwest::header::{HeaderMap, HeaderName};

#[derive(Debug, specta::Type, serde::Deserialize)]
pub struct Request {
    method: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
    body: Vec<u8>,
}

#[tauri::command]
#[specta::specta]
pub async fn fetch<R: tauri::Runtime>(
    req: Request,
    state: tauri::State<'_, crate::State>,
    _window: tauri::Window<R>,
) -> Result<String, String> {
    let _request_id = state
        .counter
        .fetch_add(1, std::sync::atomic::Ordering::SeqCst);

    let _method = req
        .method
        .parse::<reqwest::Method>()
        .map_err(|e| e.to_string())?;

    Ok("Hello, world!".to_string())
}
