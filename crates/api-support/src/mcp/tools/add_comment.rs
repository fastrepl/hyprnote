use rmcp::{
    ErrorData as McpError,
    model::*,
    schemars::{self, JsonSchema},
};
use serde::Deserialize;

use crate::github;
use crate::state::AppState;

#[derive(Debug, Deserialize, JsonSchema)]
pub(crate) struct AddCommentParams {
    #[schemars(description = "The issue number to comment on")]
    pub issue_number: u64,
    #[schemars(description = "The comment body in markdown")]
    pub body: String,
}

pub(crate) async fn add_comment(
    state: &AppState,
    params: AddCommentParams,
) -> Result<CallToolResult, McpError> {
    let url = github::add_issue_comment(state, params.issue_number, &params.body)
        .await
        .map_err(|e| McpError::internal_error(e.to_string(), None))?;

    Ok(CallToolResult::success(vec![Content::text(
        serde_json::json!({
            "success": true,
            "comment_url": url,
        })
        .to_string(),
    )]))
}
