use rmcp::{
    ErrorData as McpError,
    model::*,
    schemars::{self, JsonSchema},
};
use serde::Deserialize;

use crate::github::{self, BugReportInput};
use crate::state::AppState;

#[derive(Debug, Deserialize, JsonSchema)]
pub(crate) struct SubmitBugReportParams {
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

pub(crate) async fn submit_bug_report(
    state: &AppState,
    params: SubmitBugReportParams,
) -> Result<CallToolResult, McpError> {
    let url = github::submit_bug_report(
        state,
        BugReportInput {
            description: &params.description,
            platform: &params.platform,
            arch: &params.arch,
            os_version: &params.os_version,
            app_version: &params.app_version,
            source: "via MCP",
            logs: params.logs.as_deref(),
        },
    )
    .await
    .map_err(|e| McpError::internal_error(e.to_string(), None))?;

    Ok(CallToolResult::success(vec![Content::text(
        serde_json::json!({
            "success": true,
            "issue_url": url,
        })
        .to_string(),
    )]))
}
