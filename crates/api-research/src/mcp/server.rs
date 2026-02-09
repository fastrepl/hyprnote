use rmcp::{
    ErrorData as McpError, ServerHandler, handler::server::tool::ToolRouter,
    handler::server::wrapper::Parameters, model::*, tool, tool_handler, tool_router,
};

use crate::state::AppState;

use super::tools::{self, GetContentsParams, SearchParams};

#[derive(Clone)]
pub(crate) struct ResearchMcpServer {
    state: AppState,
    tool_router: ToolRouter<Self>,
}

impl ResearchMcpServer {
    pub(super) fn new(state: AppState) -> Self {
        Self {
            state,
            tool_router: Self::tool_router(),
        }
    }
}

#[tool_router]
impl ResearchMcpServer {
    #[tool(description = "Search the web using Exa. Returns relevant results for a given query.")]
    async fn search(
        &self,
        Parameters(params): Parameters<SearchParams>,
    ) -> Result<CallToolResult, McpError> {
        tools::search(&self.state, params).await
    }

    #[tool(
        description = "Get the contents of web pages by URL. Returns the text content of the given URLs."
    )]
    async fn get_contents(
        &self,
        Parameters(params): Parameters<GetContentsParams>,
    ) -> Result<CallToolResult, McpError> {
        tools::get_contents(&self.state, params).await
    }
}

#[tool_handler]
impl ServerHandler for ResearchMcpServer {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            protocol_version: ProtocolVersion::V_2024_11_05,
            capabilities: ServerCapabilities::builder().enable_tools().build(),
            server_info: Implementation {
                name: "hyprnote-research".to_string(),
                title: None,
                version: env!("CARGO_PKG_VERSION").to_string(),
                icons: None,
                website_url: None,
            },
            instructions: Some(
                "Hyprnote research server. Provides tools for web search and content retrieval powered by Exa."
                    .to_string(),
            ),
        }
    }
}
