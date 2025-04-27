use async_openai::types::{
    ChatCompletionRequestAssistantMessageContent, ChatCompletionRequestMessage,
    ChatCompletionRequestSystemMessageContent, ChatCompletionRequestUserMessageContent,
};

pub use llama_cpp_2::model::LlamaChatMessage;

pub trait FromOpenAI {
    fn from_openai(message: &ChatCompletionRequestMessage) -> Self;
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

#[derive(Default)]
pub struct LlamaRequest {
    pub grammar: Option<String>,
    pub messages: Vec<LlamaChatMessage>,
}
