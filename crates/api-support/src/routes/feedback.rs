use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};

use crate::error::{Result, SupportError};
use crate::state::AppState;

const OPENROUTER_BASE_URL: &str = "https://openrouter.ai/api/v1/chat/completions";
const GITHUB_OWNER: &str = "fastrepl";
const GITHUB_REPO: &str = "hyprnote";

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct DeviceInfo {
    pub platform: String,
    pub arch: String,
    pub os_version: String,
    pub app_version: String,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum FeedbackType {
    Bug,
    Feature,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct FeedbackRequest {
    pub r#type: FeedbackType,
    pub description: String,
    pub logs: Option<String>,
    pub device_info: DeviceInfo,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct FeedbackResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issue_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

async fn analyze_logs(api_key: &str, logs: &str) -> Option<String> {
    let client = reqwest::Client::new();
    let tail = &logs[logs.len().saturating_sub(10000)..];

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
    Some(content[..content.len().min(800)].to_string())
}

async fn create_github_issue(
    state: &AppState,
    title: &str,
    body: &str,
    labels: &[String],
) -> Result<(String, u64)> {
    let client = state.installation_client().await?;

    let issue = client
        .issues(GITHUB_OWNER, GITHUB_REPO)
        .create(title)
        .body(body)
        .labels(labels.to_vec())
        .send()
        .await?;

    Ok((issue.html_url.to_string(), issue.number))
}

async fn add_comment_to_issue(state: &AppState, issue_number: u64, comment: &str) -> Result<()> {
    let client = state.installation_client().await?;
    client
        .issues(GITHUB_OWNER, GITHUB_REPO)
        .create_comment(issue_number, comment)
        .await?;
    Ok(())
}

async fn create_github_discussion(
    state: &AppState,
    title: &str,
    body: &str,
    category_id: &str,
) -> Result<String> {
    use secrecy::ExposeSecret;

    let token = state.installation_token().await?;

    let client = reqwest::Client::new();
    let query = serde_json::json!({
        "query": r#"
            mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
                createDiscussion(input: {
                    repositoryId: $repositoryId
                    categoryId: $categoryId
                    title: $title
                    body: $body
                }) {
                    discussion {
                        url
                    }
                }
            }
        "#,
        "variables": {
            "repositoryId": state.config.github.github_repo_id,
            "categoryId": category_id,
            "title": title,
            "body": body,
        },
    });

    let resp = client
        .post("https://api.github.com/graphql")
        .header("Authorization", format!("token {}", token.expose_secret()))
        .header("User-Agent", "hyprnote-api")
        .json(&query)
        .send()
        .await
        .map_err(|e| SupportError::GitHub(e.to_string()))?;

    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| SupportError::GitHub(e.to_string()))?;

    data["data"]["createDiscussion"]["discussion"]["url"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| {
            SupportError::GitHub(format!(
                "unexpected GraphQL response: {}",
                serde_json::to_string(&data).unwrap_or_default()
            ))
        })
}

#[utoipa::path(
    post,
    path = "/submit",
    request_body = FeedbackRequest,
    responses(
        (status = 200, description = "Feedback submitted successfully", body = FeedbackResponse),
        (status = 400, description = "Invalid request", body = FeedbackResponse),
        (status = 500, description = "Server error", body = FeedbackResponse),
    ),
    tag = "support",
)]
pub async fn submit(
    State(state): State<AppState>,
    Json(payload): Json<FeedbackRequest>,
) -> std::result::Result<Json<FeedbackResponse>, SupportError> {
    let description = payload.description.trim().to_string();
    let first_line = description
        .lines()
        .next()
        .unwrap_or("")
        .chars()
        .take(100)
        .collect::<String>();
    let title = if first_line.is_empty() {
        match payload.r#type {
            FeedbackType::Bug => "Bug Report".to_string(),
            FeedbackType::Feature => "Feature Request".to_string(),
        }
    } else {
        first_line
    };

    let device_info_section = format!(
        "**Platform:** {}\n**Architecture:** {}\n**OS Version:** {}\n**App Version:** {}",
        payload.device_info.platform,
        payload.device_info.arch,
        payload.device_info.os_version,
        payload.device_info.app_version,
    );

    match payload.r#type {
        FeedbackType::Bug => {
            let body = format!(
                "## Description\n{description}\n\n## Device Information\n{device_info_section}\n\n---\n*This issue was submitted from the Hyprnote desktop app.*\n"
            );

            let labels = vec!["product/desktop".to_string()];
            let (url, number) = create_github_issue(&state, &title, &body, &labels).await?;

            if let Some(logs) = &payload.logs {
                let log_summary =
                    analyze_logs(&state.config.openrouter.openrouter_api_key, logs).await;

                let summary_section = match log_summary.as_deref() {
                    Some(s) if !s.trim().is_empty() => {
                        format!("### Summary\n```\n{s}\n```")
                    }
                    _ => "_No errors or warnings found._".to_string(),
                };

                let tail = &logs[logs.len().saturating_sub(10000)..];
                let log_comment = format!(
                    "## Log Analysis\n\n{summary_section}\n\n<details>\n<summary>Raw Logs (last 10KB)</summary>\n\n```\n{tail}\n```\n\n</details>"
                );

                let _ = add_comment_to_issue(&state, number, &log_comment).await;
            }

            Ok(Json(FeedbackResponse {
                success: true,
                issue_url: Some(url),
                error: None,
            }))
        }
        FeedbackType::Feature => {
            let body = format!(
                "## Feature Request\n{description}\n\n## Submitted From\n{device_info_section}\n\n---\n*This feature request was submitted from the Hyprnote desktop app.*\n"
            );

            let category_id = &state.config.github.github_discussion_category_id;
            if category_id.is_empty() {
                return Err(SupportError::Internal(
                    "GitHub discussion category not configured".to_string(),
                ));
            }

            let url = create_github_discussion(&state, &title, &body, category_id).await?;

            Ok(Json(FeedbackResponse {
                success: true,
                issue_url: Some(url),
                error: None,
            }))
        }
    }
}
