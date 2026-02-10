use rmcp::schemars::{self, JsonSchema};
use rmcp::{
    ErrorData as McpError, RoleServer, ServerHandler, elicit_safe,
    handler::server::tool::ToolRouter, handler::server::wrapper::Parameters, model::*,
    service::RequestContext, tool, tool_handler, tool_router,
};
use serde::Serialize;

#[derive(Debug, Serialize, serde::Deserialize, JsonSchema)]
struct Confirmation {
    #[schemars(description = "Set to true to confirm this action")]
    confirmed: bool,
}
elicit_safe!(Confirmation);

use crate::state::AppState;

use hypr_mcp::McpAuth;

use super::prompts;
use super::tools::{
    self, AddCommentParams, CreateBillingPortalSessionParams, CreateIssueParams,
    ListSubscriptionsParams, SearchIssuesParams,
};

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

async fn require_confirmation(
    context: &RequestContext<RoleServer>,
    message: impl Into<String>,
) -> Option<CallToolResult> {
    match context.peer.elicit::<Confirmation>(message.into()).await {
        Ok(Some(c)) if c.confirmed => None,
        _ => Some(CallToolResult::success(vec![Content::text(
            "Action cancelled by user.",
        )])),
    }
}

#[tool_router]
impl SupportMcpServer {
    #[tool(
        description = "Create a new GitHub issue.",
        annotations(
            read_only_hint = false,
            destructive_hint = true,
            idempotent_hint = false,
            open_world_hint = true
        )
    )]
    async fn create_issue(
        &self,
        context: RequestContext<RoleServer>,
        Parameters(params): Parameters<CreateIssueParams>,
    ) -> Result<CallToolResult, McpError> {
        if let Some(cancelled) = require_confirmation(
            &context,
            format!("Create GitHub issue: \"{}\"?", params.title),
        )
        .await
        {
            return Ok(cancelled);
        }
        tools::create_issue(&self.state, params).await
    }

    #[tool(
        description = "Add a new comment to an existing GitHub issue.",
        annotations(
            read_only_hint = false,
            destructive_hint = true,
            idempotent_hint = false,
            open_world_hint = true
        )
    )]
    async fn add_comment(
        &self,
        context: RequestContext<RoleServer>,
        Parameters(params): Parameters<AddCommentParams>,
    ) -> Result<CallToolResult, McpError> {
        if let Some(cancelled) = require_confirmation(
            &context,
            format!("Add comment to issue #{}?", params.issue_number),
        )
        .await
        {
            return Ok(cancelled);
        }
        tools::add_comment(&self.state, params).await
    }

    #[tool(
        description = "Search for GitHub issues by keywords, error messages, or other criteria.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn search_issues(
        &self,
        Parameters(params): Parameters<SearchIssuesParams>,
    ) -> Result<CallToolResult, McpError> {
        tools::search_issues(&self.state, params).await
    }

    #[tool(
        description = "Create a Stripe billing portal session for the customer to manage subscription and payment methods.",
        annotations(
            read_only_hint = false,
            destructive_hint = false,
            idempotent_hint = false,
            open_world_hint = true
        )
    )]
    async fn create_billing_portal_session(
        &self,
        McpAuth(auth): McpAuth,
        Parameters(params): Parameters<CreateBillingPortalSessionParams>,
    ) -> Result<CallToolResult, McpError> {
        let auth = auth.ok_or_else(|| {
            McpError::invalid_request("Sign in to manage your subscription", None)
        })?;
        tools::create_billing_portal_session(&self.state, &auth, params).await
    }

    #[tool(
        description = "List the customer's Stripe subscriptions, optionally filtered by status.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn list_subscriptions(
        &self,
        McpAuth(auth): McpAuth,
        Parameters(params): Parameters<ListSubscriptionsParams>,
    ) -> Result<CallToolResult, McpError> {
        let auth = auth.ok_or_else(|| {
            McpError::invalid_request("Sign in to manage your subscription", None)
        })?;
        tools::list_subscriptions(&self.state, &auth, params).await
    }
}

#[tool_handler]
impl ServerHandler for SupportMcpServer {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            protocol_version: ProtocolVersion::LATEST,
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
                "Hyprnote support server. Provides tools for managing GitHub issues.".to_string(),
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
