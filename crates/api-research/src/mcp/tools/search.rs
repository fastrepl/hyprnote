use rmcp::{
    ErrorData as McpError,
    model::*,
    schemars::{self, JsonSchema},
};
use serde::Deserialize;

use crate::state::AppState;

#[derive(Debug, Deserialize, JsonSchema)]
pub(crate) struct SearchParams {
    #[schemars(description = "The search query")]
    pub query: String,
    #[schemars(description = "Number of results to return")]
    pub num_results: Option<u32>,
}

pub(crate) async fn search(
    state: &AppState,
    params: SearchParams,
) -> Result<CallToolResult, McpError> {
    let response = state
        .exa
        .search(exa::SearchRequest {
            query: params.query,
            r#type: Some(exa::SearchType::Auto),
            category: None,
            num_results: params.num_results,
            include_domains: None,
            exclude_domains: None,
            start_crawl_date: None,
            end_crawl_date: None,
            start_published_date: None,
            end_published_date: None,
            include_text: None,
            exclude_text: None,
            contents: None,
        })
        .await
        .map_err(|e| McpError::internal_error(e.to_string(), None))?;

    Ok(CallToolResult::success(vec![Content::text(
        serde_json::to_string(&response)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?,
    )]))
}
