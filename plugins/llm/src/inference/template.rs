use super::SupportedModel;
use async_openai::types::{
    ChatCompletionRequestMessage, ChatCompletionRequestSystemMessageContent,
    ChatCompletionRequestUserMessageContent, CreateChatCompletionRequest,
};

impl SupportedModel {
    pub fn apply_chat_template(&self, request: &CreateChatCompletionRequest) -> String {
        let mut prompt = String::new();

        match self {
            // https://huggingface.co/NousResearch/Hermes-3-Llama-3.2-3B#prompt-format
            SupportedModel::Llama32_3b => {
                for message in &request.messages {
                    match message {
                        ChatCompletionRequestMessage::System(msg) => {
                            prompt.push_str("<|im_start|>system\n");
                            if let ChatCompletionRequestSystemMessageContent::Text(text) =
                                &msg.content
                            {
                                prompt.push_str(text);
                            }
                            prompt.push_str("<|im_end|>\n");
                        }
                        ChatCompletionRequestMessage::User(msg) => {
                            prompt.push_str("<|im_start|>user\n");
                            if let ChatCompletionRequestUserMessageContent::Text(text) =
                                &msg.content
                            {
                                prompt.push_str(text)
                            }
                            prompt.push_str("<|im_end|>\n");
                        }
                        _ => {}
                    }
                }

                prompt.push_str("<|im_start|>assistant\n");
            }
        }

        prompt
    }

    pub fn eos_token(&self) -> String {
        match self {
            SupportedModel::Llama32_3b => "<|im_end|>".to_string(),
        }
    }
}
