use rmcp::{
    ErrorData as McpError,
    model::*,
    schemars::{self, JsonSchema},
};
use serde::Deserialize;

use crate::github;
use crate::state::AppState;

#[derive(Debug, Deserialize, JsonSchema)]
pub(crate) struct CreateIssueParams {
    #[schemars(description = "Title of the issue")]
    pub title: String,
    #[schemars(description = "Body/description of the issue in markdown")]
    pub body: String,
    #[schemars(description = "Labels to apply to the issue")]
    pub labels: Option<Vec<String>>,
}

pub(crate) async fn create_issue(
    state: &AppState,
    params: CreateIssueParams,
) -> Result<CallToolResult, McpError> {
    let labels = params.labels.unwrap_or_default();

    let (url, number) = github::create_issue(state, &params.title, &params.body, &labels)
        .await
        .map_err(|e| McpError::internal_error(e.to_string(), None))?;

    Ok(CallToolResult::success(vec![Content::text(
        serde_json::json!({
            "success": true,
            "issue_url": url,
            "issue_number": number,
        })
        .to_string(),
    )]))
}
