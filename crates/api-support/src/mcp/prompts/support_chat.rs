use askama::Template;
use rmcp::{ErrorData as McpError, model::*};

#[derive(Template, Default)]
#[template(path = "support_chat.md.jinja")]
struct SupportChatPrompt;

pub(crate) fn support_chat() -> Result<GetPromptResult, McpError> {
    hypr_mcp::render_prompt::<SupportChatPrompt>("System prompt for the Hyprnote support chat")
}
