use rmcp::{
    ErrorData as McpError,
    model::*,
    schemars::{self, JsonSchema},
};
use serde::Deserialize;

use crate::github;
use crate::state::AppState;

#[derive(Debug, Deserialize, JsonSchema)]
pub(crate) struct SearchIssuesParams {
    #[schemars(description = "Search query string (e.g. keywords, error messages)")]
    pub query: String,
    #[schemars(description = "Filter by state: 'open' or 'closed'")]
    pub state: Option<String>,
    #[schemars(description = "Maximum number of results to return (default: 20, max: 100)")]
    pub limit: Option<u8>,
}

pub(crate) async fn search_issues(
    state: &AppState,
    params: SearchIssuesParams,
) -> Result<CallToolResult, McpError> {
    let limit = params.limit.unwrap_or(20).min(100);

    let items = github::search_issues(state, &params.query, params.state.as_deref(), limit)
        .await
        .map_err(|e| McpError::internal_error(e.to_string(), None))?;

    Ok(CallToolResult::success(vec![Content::text(
        serde_json::json!({
            "total_results": items.len(),
            "issues": items,
        })
        .to_string(),
    )]))
}
