const OPENROUTER_BASE_URL: &str = "https://openrouter.ai/api/v1/chat/completions";

pub(crate) fn safe_tail(s: &str, max_bytes: usize) -> &str {
    let start = s.len().saturating_sub(max_bytes);
    let start = s
        .char_indices()
        .map(|(i, _)| i)
        .find(|&i| i >= start)
        .unwrap_or(s.len());
    &s[start..]
}

pub(crate) async fn analyze_logs(api_key: &str, logs: &str) -> Option<String> {
    let client = reqwest::Client::new();
    let tail = safe_tail(logs, 10000);

    let body = serde_json::json!({
        "model": "google/gemini-2.0-flash-001",
        "max_tokens": 300,
        "messages": [{
            "role": "user",
            "content": format!(
                "Extract only ERROR and WARNING entries from these logs. Output max 800 chars, no explanation:\n\n{tail}"
            ),
        }],
    });

    let resp = client
        .post(OPENROUTER_BASE_URL)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {api_key}"))
        .json(&body)
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let data: serde_json::Value = resp.json().await.ok()?;
    let content = data["choices"][0]["message"]["content"].as_str()?;
    Some(content.chars().take(800).collect::<String>())
}
