use rmcp::schemars::{self, JsonSchema};
use rmcp::{
    ErrorData as McpError, ServerHandler,
    handler::server::tool::ToolRouter,
    handler::server::wrapper::Parameters,
    model::*,
    tool, tool_handler, tool_router,
    transport::streamable_http_server::{
        StreamableHttpServerConfig, StreamableHttpService, session::local::LocalSessionManager,
    },
};
use serde::Deserialize;

use crate::config::SupportConfig;
use crate::state::AppState;

#[derive(Debug, Deserialize, JsonSchema)]
pub struct SubmitBugReportParams {
    #[schemars(description = "Description of the bug")]
    pub description: String,
    #[schemars(description = "Platform (e.g. macos, windows, linux)")]
    pub platform: String,
    #[schemars(description = "Architecture (e.g. aarch64, x86_64)")]
    pub arch: String,
    #[schemars(description = "OS version")]
    pub os_version: String,
    #[schemars(description = "Application version")]
    pub app_version: String,
    #[schemars(description = "Optional application logs for analysis")]
    pub logs: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct SubmitFeatureRequestParams {
    #[schemars(description = "Description of the feature request")]
    pub description: String,
    #[schemars(description = "Platform (e.g. macos, windows, linux)")]
    pub platform: String,
    #[schemars(description = "Architecture (e.g. aarch64, x86_64)")]
    pub arch: String,
    #[schemars(description = "OS version")]
    pub os_version: String,
    #[schemars(description = "Application version")]
    pub app_version: String,
}

const OPENROUTER_BASE_URL: &str = "https://openrouter.ai/api/v1/chat/completions";
const GITHUB_OWNER: &str = "fastrepl";
const GITHUB_REPO: &str = "hyprnote";

#[derive(Clone)]
pub struct SupportMcpServer {
    state: AppState,
    tool_router: ToolRouter<Self>,
}

impl SupportMcpServer {
    fn new(state: AppState) -> Self {
        Self {
            state,
            tool_router: Self::tool_router(),
        }
    }
}

fn safe_tail(s: &str, max_bytes: usize) -> &str {
    let start = s.len().saturating_sub(max_bytes);
    let start = s
        .char_indices()
        .map(|(i, _)| i)
        .find(|&i| i >= start)
        .unwrap_or(s.len());
    &s[start..]
}

async fn analyze_logs(api_key: &str, logs: &str) -> Option<String> {
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

#[tool_router]
impl SupportMcpServer {
    #[tool(
        description = "Submit a bug report. Creates a GitHub issue with device information and optional log analysis."
    )]
    async fn submit_bug_report(
        &self,
        Parameters(params): Parameters<SubmitBugReportParams>,
    ) -> Result<CallToolResult, McpError> {
        let description = params.description.trim().to_string();
        let first_line = description
            .lines()
            .next()
            .unwrap_or("")
            .chars()
            .take(100)
            .collect::<String>();
        let title = if first_line.is_empty() {
            "Bug Report".to_string()
        } else {
            first_line
        };

        let device_info_section = format!(
            "**Platform:** {}\n**Architecture:** {}\n**OS Version:** {}\n**App Version:** {}",
            params.platform, params.arch, params.os_version, params.app_version,
        );

        let body = format!(
            "## Description\n{description}\n\n## Device Information\n{device_info_section}\n\n---\n*This issue was submitted via MCP.*\n"
        );

        let labels = vec!["product/desktop".to_string()];

        let client = self
            .state
            .installation_client()
            .await
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        let issue = client
            .issues(GITHUB_OWNER, GITHUB_REPO)
            .create(&title)
            .body(&body)
            .labels(labels)
            .send()
            .await
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        let issue_url = issue.html_url.to_string();
        let issue_number = issue.number;

        if let Some(logs) = &params.logs {
            let log_summary =
                analyze_logs(&self.state.config.openrouter.openrouter_api_key, logs).await;

            let summary_section = match log_summary.as_deref() {
                Some(s) if !s.trim().is_empty() => {
                    format!("### Summary\n```\n{s}\n```")
                }
                _ => "_No errors or warnings found._".to_string(),
            };

            let tail = safe_tail(logs, 10000);
            let log_comment = format!(
                "## Log Analysis\n\n{summary_section}\n\n<details>\n<summary>Raw Logs (last 10KB)</summary>\n\n```\n{tail}\n```\n\n</details>"
            );

            let _ = client
                .issues(GITHUB_OWNER, GITHUB_REPO)
                .create_comment(issue_number, &log_comment)
                .await;
        }

        Ok(CallToolResult::success(vec![Content::text(
            serde_json::json!({
                "success": true,
                "issue_url": issue_url,
            })
            .to_string(),
        )]))
    }

    #[tool(description = "Submit a feature request. Creates a GitHub discussion.")]
    async fn submit_feature_request(
        &self,
        Parameters(params): Parameters<SubmitFeatureRequestParams>,
    ) -> Result<CallToolResult, McpError> {
        let description = params.description.trim().to_string();
        let first_line = description
            .lines()
            .next()
            .unwrap_or("")
            .chars()
            .take(100)
            .collect::<String>();
        let title = if first_line.is_empty() {
            "Feature Request".to_string()
        } else {
            first_line
        };

        let device_info_section = format!(
            "**Platform:** {}\n**Architecture:** {}\n**OS Version:** {}\n**App Version:** {}",
            params.platform, params.arch, params.os_version, params.app_version,
        );

        let body = format!(
            "## Feature Request\n{description}\n\n## Submitted From\n{device_info_section}\n\n---\n*This feature request was submitted via MCP.*\n"
        );

        let category_id = &self.state.config.github.github_discussion_category_id;
        if category_id.is_empty() {
            return Err(McpError::internal_error(
                "GitHub discussion category not configured".to_string(),
                None,
            ));
        }

        use secrecy::ExposeSecret;

        let token = self
            .state
            .installation_token()
            .await
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

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
                "repositoryId": self.state.config.github.github_repo_id,
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
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        let data: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        let url = data["data"]["createDiscussion"]["discussion"]["url"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| {
                McpError::internal_error(
                    format!(
                        "unexpected GraphQL response: {}",
                        serde_json::to_string(&data).unwrap_or_default()
                    ),
                    None,
                )
            })?;

        Ok(CallToolResult::success(vec![Content::text(
            serde_json::json!({
                "success": true,
                "discussion_url": url,
            })
            .to_string(),
        )]))
    }
}

#[tool_handler]
impl ServerHandler for SupportMcpServer {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            protocol_version: ProtocolVersion::V_2024_11_05,
            capabilities: ServerCapabilities::builder().enable_tools().build(),
            server_info: Implementation {
                name: "hyprnote-support".to_string(),
                title: None,
                version: env!("CARGO_PKG_VERSION").to_string(),
                icons: None,
                website_url: None,
            },
            instructions: Some(
                "Hyprnote support server. Provides tools for submitting bug reports and feature requests."
                    .to_string(),
            ),
        }
    }
}

pub fn mcp_service(
    config: SupportConfig,
    cancellation_token: tokio_util::sync::CancellationToken,
) -> StreamableHttpService<SupportMcpServer> {
    let state = AppState::new(config);
    StreamableHttpService::new(
        move || Ok(SupportMcpServer::new(state.clone())),
        LocalSessionManager::default().into(),
        StreamableHttpServerConfig {
            cancellation_token,
            ..Default::default()
        },
    )
}
