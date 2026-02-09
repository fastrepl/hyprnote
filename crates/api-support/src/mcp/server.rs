use rmcp::{
    ErrorData as McpError, RoleServer, ServerHandler, handler::server::tool::ToolRouter,
    handler::server::wrapper::Parameters, model::*, service::RequestContext, tool, tool_handler,
    tool_router,
};

use crate::state::AppState;

use super::prompts;
use super::tools::{self, ReadGitHubDataParams, SubmitBugReportParams, SubmitFeatureRequestParams};

#[derive(Clone)]
pub(crate) struct SupportMcpServer {
    state: AppState,
    tool_router: ToolRouter<Self>,
}

impl SupportMcpServer {
    pub(super) fn new(state: AppState) -> Self {
        Self {
            state,
            tool_router: Self::tool_router(),
        }
    }
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
        tools::submit_bug_report(&self.state, params).await
    }

    #[tool(description = "Submit a feature request. Creates a GitHub discussion.")]
    async fn submit_feature_request(
        &self,
        Parameters(params): Parameters<SubmitFeatureRequestParams>,
    ) -> Result<CallToolResult, McpError> {
        tools::submit_feature_request(&self.state, params).await
    }

    #[tool(
        description = "Read GitHub data (issues, pull requests, comments, tags) from the database. Data is synced from GitHub via Airbyte."
    )]
    async fn read_github_data(
        &self,
        Parameters(params): Parameters<ReadGitHubDataParams>,
    ) -> Result<CallToolResult, McpError> {
        tools::read_github_data(&self.state, params).await
    }
}

#[tool_handler]
impl ServerHandler for SupportMcpServer {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            protocol_version: ProtocolVersion::V_2024_11_05,
            capabilities: ServerCapabilities::builder()
                .enable_tools()
                .enable_prompts()
                .build(),
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

    async fn list_prompts(
        &self,
        _params: Option<PaginatedRequestParams>,
        _context: RequestContext<RoleServer>,
    ) -> Result<ListPromptsResult, McpError> {
        Ok(ListPromptsResult {
            prompts: vec![Prompt::new(
                "support_chat",
                Some("System prompt for the Hyprnote support chat"),
                None::<Vec<PromptArgument>>,
            )],
            next_cursor: None,
            meta: None,
        })
    }

    async fn get_prompt(
        &self,
        params: GetPromptRequestParams,
        _context: RequestContext<RoleServer>,
    ) -> Result<GetPromptResult, McpError> {
        match params.name.as_str() {
            "support_chat" => prompts::support_chat(),
            _ => Err(McpError::invalid_params(
                format!("Unknown prompt: {}", params.name),
                None,
            )),
        }
    }
}
