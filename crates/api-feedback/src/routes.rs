use axum::{Json, Router, extract::State, http::StatusCode, response::IntoResponse, routing::post};
use serde::{Deserialize, Serialize};

use crate::config::FeedbackConfig;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) client: reqwest::Client,
    pub(crate) config: FeedbackConfig,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FeedbackRequest {
    description: String,
    logs: Option<String>,
    device_info: DeviceInfo,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeviceInfo {
    platform: String,
    arch: String,
    os_version: String,
    app_version: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FeedbackResponse {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    issue_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

pub fn router(config: FeedbackConfig) -> Router {
    let state = config.into_state();

    Router::new()
        .route("/submit", post(submit_feedback))
        .with_state(state)
}

async fn submit_feedback(
    State(state): State<AppState>,
    Json(req): Json<FeedbackRequest>,
) -> impl IntoResponse {
    let description = req.description.trim().to_string();
    if description.len() < 10 {
        return (
            StatusCode::BAD_REQUEST,
            Json(FeedbackResponse {
                success: false,
                issue_url: None,
                error: Some("Description must be at least 10 characters".into()),
            }),
        );
    }

    let first_line = description
        .lines()
        .next()
        .unwrap_or("")
        .chars()
        .take(100)
        .collect::<String>();
    let title = if first_line.trim().is_empty() {
        "Feedback".to_string()
    } else {
        first_line.trim().to_string()
    };

    let device_info_section = format!(
        "**Platform:** {}\n**Architecture:** {}\n**OS Version:** {}\n**App Version:** {}",
        req.device_info.platform,
        req.device_info.arch,
        req.device_info.os_version,
        req.device_info.app_version,
    );

    let body = format!(
        "## Description\n{}\n\n## Device Information\n{}\n\n---\n*This issue was submitted from the Hyprnote desktop app.*\n",
        description, device_info_section,
    );

    let issue = match create_github_issue(&state, &title, &body).await {
        Ok(issue) => issue,
        Err(e) => {
            tracing::error!(error = %e, "failed to create github issue");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(FeedbackResponse {
                    success: false,
                    issue_url: None,
                    error: Some(e),
                }),
            );
        }
    };

    if let Some(logs) = &req.logs {
        let log_summary = analyze_logs(&state, logs).await;
        let summary_section = match &log_summary {
            Some(s) if !s.trim().is_empty() => format!("### Summary\n```\n{}\n```", s),
            _ => "_No errors or warnings found._".to_string(),
        };
        let log_comment = format!(
            "## Log Analysis\n\n{}\n\n<details>\n<summary>Raw Logs (last 10KB)</summary>\n\n```\n{}\n```\n\n</details>",
            summary_section,
            &logs[logs.len().saturating_sub(10000)..],
        );
        if let Err(e) = add_comment_to_issue(&state, issue.number, &log_comment).await {
            tracing::warn!(error = %e, "failed to add log comment to issue");
        }
    }

    (
        StatusCode::OK,
        Json(FeedbackResponse {
            success: true,
            issue_url: Some(issue.url),
            error: None,
        }),
    )
}

struct GitHubIssue {
    url: String,
    number: u64,
}

async fn get_installation_token(state: &AppState) -> Result<String, String> {
    let app_id = state
        .config
        .charlie
        .charlie_app_id
        .as_deref()
        .ok_or("GitHub App credentials not configured")?;
    let private_key_pem = state
        .config
        .charlie
        .charlie_app_private_key
        .as_deref()
        .ok_or("GitHub App credentials not configured")?;
    let installation_id = state
        .config
        .charlie
        .charlie_app_installation_id
        .as_deref()
        .ok_or("GitHub App credentials not configured")?;

    let private_key_pem = private_key_pem.replace("\\n", "\n");

    let now = jsonwebtoken::get_current_timestamp();
    let claims = serde_json::json!({
        "iat": now - 60,
        "exp": now + 600,
        "iss": app_id,
    });

    let encoding_key = jsonwebtoken::EncodingKey::from_rsa_pem(private_key_pem.as_bytes())
        .map_err(|e| format!("Failed to parse private key: {}", e))?;

    let jwt = jsonwebtoken::encode(
        &jsonwebtoken::Header::new(jsonwebtoken::Algorithm::RS256),
        &claims,
        &encoding_key,
    )
    .map_err(|e| format!("Failed to create JWT: {}", e))?;

    #[derive(Deserialize)]
    struct TokenResponse {
        token: String,
    }

    let resp = state
        .client
        .post(format!(
            "https://api.github.com/app/installations/{}/access_tokens",
            installation_id
        ))
        .header("Authorization", format!("Bearer {}", jwt))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "hyprnote-api")
        .send()
        .await
        .map_err(|e| format!("GitHub API error: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error ({}): {}", status, body));
    }

    let token_resp: TokenResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    Ok(token_resp.token)
}

async fn create_github_issue(
    state: &AppState,
    title: &str,
    body: &str,
) -> Result<GitHubIssue, String> {
    let token = get_installation_token(state).await?;

    #[derive(Deserialize)]
    struct IssueResponse {
        html_url: String,
        number: u64,
    }

    let resp = state
        .client
        .post("https://api.github.com/repos/fastrepl/hyprnote/issues")
        .header("Authorization", format!("token {}", token))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "hyprnote-api")
        .json(&serde_json::json!({
            "title": title,
            "body": body,
            "labels": ["product/desktop"],
        }))
        .send()
        .await
        .map_err(|e| format!("GitHub API error: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error ({}): {}", status, body));
    }

    let issue: IssueResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse issue response: {}", e))?;

    Ok(GitHubIssue {
        url: issue.html_url,
        number: issue.number,
    })
}

async fn add_comment_to_issue(
    state: &AppState,
    issue_number: u64,
    comment: &str,
) -> Result<(), String> {
    let token = get_installation_token(state).await?;

    let resp = state
        .client
        .post(format!(
            "https://api.github.com/repos/fastrepl/hyprnote/issues/{}/comments",
            issue_number
        ))
        .header("Authorization", format!("token {}", token))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "hyprnote-api")
        .json(&serde_json::json!({
            "body": comment,
        }))
        .send()
        .await
        .map_err(|e| format!("GitHub API error: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error ({}): {}", status, body));
    }

    Ok(())
}

async fn analyze_logs(state: &AppState, logs: &str) -> Option<String> {
    let api_key = &state.config.openrouter.as_ref()?.openrouter_api_key;

    let resp = state
        .client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "model": "google/gemini-2.0-flash-001",
            "max_tokens": 300,
            "messages": [{
                "role": "user",
                "content": format!(
                    "Extract only ERROR and WARNING entries from these logs. Output max 800 chars, no explanation:\n\n{}",
                    &logs[logs.len().saturating_sub(10000)..]
                ),
            }],
        }))
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    #[derive(Deserialize)]
    struct Choice {
        message: Message,
    }
    #[derive(Deserialize)]
    struct Message {
        content: Option<String>,
    }
    #[derive(Deserialize)]
    struct CompletionResponse {
        choices: Option<Vec<Choice>>,
    }

    let data: CompletionResponse = resp.json().await.ok()?;
    let content = data.choices?.into_iter().next()?.message.content?;
    if content.is_empty() {
        None
    } else {
        Some(content.chars().take(800).collect())
    }
}
