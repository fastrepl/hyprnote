use askama::Template;
use rmcp::{ErrorData as McpError, model::*};

#[derive(Template)]
#[template(path = "research_chat.md.jinja")]
struct ResearchChatPrompt;

pub(crate) fn research_chat() -> Result<GetPromptResult, McpError> {
    let content = ResearchChatPrompt
        .render()
        .map_err(|e| McpError::internal_error(e.to_string(), None))?;

    Ok(GetPromptResult {
        description: Some("System prompt for the Hyprnote research chat".to_string()),
        messages: vec![PromptMessage::new_text(
            PromptMessageRole::Assistant,
            content,
        )],
    })
}
