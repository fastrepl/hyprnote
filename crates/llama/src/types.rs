use async_openai::types::{
    ChatCompletionRequestAssistantMessageContent, ChatCompletionRequestMessage,
    ChatCompletionRequestSystemMessageContent, ChatCompletionRequestToolMessageContent,
    ChatCompletionRequestUserMessageContent, ChatCompletionTool,
};

pub use llama_cpp_2::model::LlamaChatMessage;

#[derive(Default)]
pub struct LlamaRequest {
    pub grammar: Option<String>,
    pub messages: Vec<LlamaMessage>,
    pub tools: Option<Vec<ChatCompletionTool>>,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LlamaMessage {
    pub role: String,
    pub content: String,
}

pub trait FromOpenAI {
    fn from_openai(message: &ChatCompletionRequestMessage) -> Self;
}

impl FromOpenAI for LlamaMessage {
    fn from_openai(message: &ChatCompletionRequestMessage) -> Self {
        match message {
            ChatCompletionRequestMessage::System(system) => {
                let content = match &system.content {
                    ChatCompletionRequestSystemMessageContent::Text(text) => text,
                    _ => todo!(),
                };

                LlamaMessage {
                    role: "system".into(),
                    content: content.clone(),
                }
            }
            ChatCompletionRequestMessage::Assistant(assistant) => {
                let content = match &assistant.content {
                    Some(ChatCompletionRequestAssistantMessageContent::Text(text)) => text,
                    _ => todo!(),
                };
                LlamaMessage {
                    role: "assistant".into(),
                    content: content.clone(),
                }
            }
            ChatCompletionRequestMessage::User(user) => {
                let content = match &user.content {
                    ChatCompletionRequestUserMessageContent::Text(text) => text,
                    _ => todo!(),
                };

                LlamaMessage {
                    role: "user".into(),
                    content: content.clone(),
                }
            }
            ChatCompletionRequestMessage::Tool(tool) => {
                let content = match &tool.content {
                    ChatCompletionRequestToolMessageContent::Text(text) => text,
                    _ => todo!(),
                };

                LlamaMessage {
                    role: "tool".into(),
                    content: content.clone(),
                }
            }
            _ => todo!(),
        }
    }
}

impl FromOpenAI for LlamaChatMessage {
    fn from_openai(message: &ChatCompletionRequestMessage) -> Self {
        match message {
            ChatCompletionRequestMessage::System(system) => {
                let content = match &system.content {
                    ChatCompletionRequestSystemMessageContent::Text(text) => text,
                    _ => todo!(),
                };

                LlamaChatMessage::new("system".into(), content.into()).unwrap()
            }
            ChatCompletionRequestMessage::Assistant(assistant) => {
                let content = match &assistant.content {
                    Some(ChatCompletionRequestAssistantMessageContent::Text(text)) => text,
                    _ => todo!(),
                };
                LlamaChatMessage::new("assistant".into(), content.into()).unwrap()
            }
            ChatCompletionRequestMessage::User(user) => {
                let content = match &user.content {
                    ChatCompletionRequestUserMessageContent::Text(text) => text,
                    _ => todo!(),
                };

                LlamaChatMessage::new("user".into(), content.into()).unwrap()
            }
            _ => todo!(),
        }
    }
}
