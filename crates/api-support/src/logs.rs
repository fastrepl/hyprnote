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
    let client = hypr_openrouter::Client::new(api_key);
    let tail = safe_tail(logs, 10000);

    let req = hypr_openrouter::ChatCompletionRequest {
        model: Some("google/gemini-2.0-flash-001".to_string()),
        max_tokens: Some(300),
        messages: vec![hypr_openrouter::ChatMessage::new(
            hypr_openrouter::Role::User,
            format!(
                "Extract only ERROR and WARNING entries from these logs. Output max 800 chars, no explanation:\n\n{tail}"
            ),
        )],
        ..Default::default()
    };

    let resp = client.chat_completion(&req).await.ok()?;
    let content = resp.choices.first()?.message.content.as_ref()?;
    let text = content.as_text()?;
    Some(text.chars().take(800).collect())
}
