mod client;
mod error;
mod types;

pub use client::*;
pub use error::*;
pub use types::*;

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    fn client() -> Client {
        let api_key = std::env::var("OPENROUTER_API_KEY").expect("OPENROUTER_API_KEY not set");
        Client::new(api_key)
    }

    #[tokio::test]
    #[ignore]
    async fn test_non_streaming() {
        let req = ChatCompletionRequest {
            model: "google/gemini-2.0-flash-001".into(),
            max_tokens: Some(50),
            messages: vec![ChatMessage::new(Role::User, "Say hello in one word.")],
            ..Default::default()
        };

        let resp = client().chat_completion(&req).await.unwrap();
        assert!(!resp.choices.is_empty());
        assert!(resp.choices[0].message.content.is_some());
    }

    #[tokio::test]
    #[ignore]
    async fn test_streaming() {
        let req = ChatCompletionRequest {
            model: "google/gemini-2.0-flash-001".into(),
            max_tokens: Some(50),
            messages: vec![ChatMessage::new(Role::User, "Say hello in one word.")],
            ..Default::default()
        };

        let mut stream = client().chat_completion_stream(&req).await.unwrap();
        let mut got_content = false;

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.unwrap();
            if let Some(choice) = chunk.choices.first() {
                if choice.delta.content.is_some() {
                    got_content = true;
                }
            }
        }

        assert!(got_content);
    }
}
