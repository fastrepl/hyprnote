use rmcp::{
    ErrorData as McpError,
    model::*,
    schemars::{self, JsonSchema},
};
use serde::Deserialize;

use crate::state::AppState;

#[derive(Debug, Deserialize, JsonSchema)]
pub(crate) struct GetContentsParams {
    #[schemars(description = "List of URLs to get contents from")]
    pub urls: Vec<String>,
}

pub(crate) async fn get_contents(
    state: &AppState,
    params: GetContentsParams,
) -> Result<CallToolResult, McpError> {
    let response = state
        .exa
        .get_contents(hypr_exa::GetContentsRequest {
            urls: params.urls,
            text: None,
            highlights: None,
            summary: None,
            livecrawl: None,
            livecrawl_timeout: None,
            max_age_hours: None,
        })
        .await
        .map_err(|e: hypr_exa::Error| McpError::internal_error(e.to_string(), None))?;

    Ok(CallToolResult::success(vec![Content::text(
        serde_json::to_string(&response)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?,
    )]))
}
