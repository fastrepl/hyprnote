use rmcp::{
    ErrorData as McpError,
    model::*,
    schemars::{self, JsonSchema},
};
use serde::Deserialize;

use crate::state::AppState;

#[derive(Debug, Clone, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub(crate) enum GitHubTable {
    #[schemars(description = "GitHub issues")]
    Issues,
    #[schemars(description = "GitHub pull requests")]
    PullRequests,
    #[schemars(description = "GitHub comments")]
    Comments,
    #[schemars(description = "GitHub tags")]
    Tags,
}

impl GitHubTable {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Issues => "issues",
            Self::PullRequests => "pull_requests",
            Self::Comments => "comments",
            Self::Tags => "tags",
        }
    }
}

#[derive(Debug, Deserialize, JsonSchema)]
pub(crate) struct ReadGitHubDataParams {
    #[schemars(description = "The table to read from")]
    pub table: GitHubTable,
    #[schemars(description = "Maximum number of rows to return (default: 50, max: 500)")]
    pub limit: Option<i64>,
    #[schemars(description = "Number of rows to skip (default: 0)")]
    pub offset: Option<i64>,
    #[schemars(
        description = "Filter by state (e.g. 'open', 'closed'). Applicable to issues and pull_requests."
    )]
    pub state: Option<String>,
}

pub(crate) async fn read_github_data(
    state: &AppState,
    params: ReadGitHubDataParams,
) -> Result<CallToolResult, McpError> {
    let table_name = params.table.as_str();
    let limit = params.limit.unwrap_or(50).min(500);
    let offset = params.offset.unwrap_or(0);

    let query = if let Some(ref state_filter) = params.state {
        let q = format!(
            "SELECT to_jsonb(t.*) AS row_data FROM hyprnote_github.{} t WHERE t.state = $1 ORDER BY t._airbyte_extracted_at DESC LIMIT $2 OFFSET $3",
            table_name
        );
        sqlx::query_scalar::<_, serde_json::Value>(&q)
            .bind(state_filter)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db_pool)
            .await
    } else {
        let q = format!(
            "SELECT to_jsonb(t.*) AS row_data FROM hyprnote_github.{} t ORDER BY t._airbyte_extracted_at DESC LIMIT $1 OFFSET $2",
            table_name
        );
        sqlx::query_scalar::<_, serde_json::Value>(&q)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db_pool)
            .await
    };

    let rows = query.map_err(|e| McpError::internal_error(e.to_string(), None))?;

    let count_query = format!("SELECT COUNT(*) FROM hyprnote_github.{}", table_name);
    let total_count: i64 = sqlx::query_scalar(&count_query)
        .fetch_one(&state.db_pool)
        .await
        .unwrap_or(0);

    let result = serde_json::json!({
        "table": table_name,
        "total_count": total_count,
        "returned_count": rows.len(),
        "limit": limit,
        "offset": offset,
        "rows": rows,
    });

    Ok(CallToolResult::success(vec![Content::text(
        result.to_string(),
    )]))
}
