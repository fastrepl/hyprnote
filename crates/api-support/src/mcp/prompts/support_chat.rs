use askama::Template;
use rmcp::{ErrorData as McpError, model::*};

#[derive(Template)]
#[template(path = "support_chat.md.jinja")]
struct SupportChatPrompt;

pub(crate) fn support_chat() -> Result<GetPromptResult, McpError> {
    let content = SupportChatPrompt
        .render()
        .map_err(|e| McpError::internal_error(e.to_string(), None))?;

    Ok(GetPromptResult {
        description: Some("System prompt for the Hyprnote support chat".to_string()),
        messages: vec![PromptMessage::new_text(
            PromptMessageRole::Assistant,
            content,
        )],
    })
}
