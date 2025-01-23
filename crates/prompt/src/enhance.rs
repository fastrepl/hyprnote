#![allow(unused)]
type Input = hypr_bridge::EnhanceRequest;

pub fn request_from(
    input: &Input,
) -> Result<hypr_openai::CreateChatCompletionRequest, crate::Error> {
    let ctx = crate::Context::from_serialize(input)?;
    let prompt = crate::render(crate::Template::Enhance, &ctx)?;

    Ok(hypr_openai::CreateChatCompletionRequest {
        model: "gpt-4o".to_string(),
        messages: vec![
            hypr_openai::ChatCompletionRequestSystemMessageArgs::default()
                .content("You are a helpful assistant that only outputs HTML. No code block, no explanation.")
                .build()
                .unwrap()
                .into(),
            hypr_openai::ChatCompletionRequestUserMessageArgs::default().content(prompt).build().unwrap().into(),
        ],
        temperature: Some(0.1),
        stream: Some(false),
        ..Default::default()
    })
}

// cargo test -p prompt enhance::tests -- --include-ignored -- --nocapture
#[cfg(test)]
mod tests {
    use super::*;

    #[derive(serde::Deserialize)]
    struct ConversationItem {
        pub speaker: String,
        pub start: u64,
        pub end: u64,
        pub text: String,
    }

    fn transcript_from_path(p: impl AsRef<std::path::Path>) -> hypr_db::user::Transcript {
        let data = std::fs::read_to_string(p).unwrap();
        let value: serde_json::Value = serde_json::from_str(&data).unwrap();
        let conversation: Vec<ConversationItem> = value["conversation"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| serde_json::from_value(v.clone()).unwrap())
            .collect();

        hypr_db::user::Transcript {
            blocks: conversation
                .iter()
                .map(|item| hypr_db::user::TranscriptBlock {
                    start: item.start as i32,
                    end: item.end as i32,
                    text: item.text.clone(),
                })
                .collect(),
        }
    }

    fn input_1() -> Input {
        let note = std::fs::read_to_string("data/1/note.md").unwrap();
        let transcript = transcript_from_path("data/1/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: hypr_db::user::ConfigDataProfile::default(),
            editor: markdown::to_html(&note),
            transcript,
        }
    }

    async fn run_input(input: Input) {
        let openai = hypr_openai::OpenAIClient::builder()
            .api_base("https://api.openai.com/v1")
            .api_key(std::env::var("OPENAI_API_KEY").unwrap())
            .build();

        let req = request_from(&input).unwrap();
        let res: hypr_openai::CreateChatCompletionResponse = openai
            .chat_completion(&req)
            .await
            .unwrap()
            .json()
            .await
            .unwrap();
        let content = res.choices[0].message.content.clone().unwrap();

        bat::PrettyPrinter::new()
            .language("html")
            .grid(true)
            .input_from_bytes(content.as_bytes())
            .print()
            .unwrap();
    }

    #[test]
    fn test_enhance_format() {
        let ctx = crate::Context::from_serialize(&input_1()).unwrap();
        let output = crate::render(crate::Template::Enhance, &ctx).unwrap();
        assert!(!output.is_empty());
    }

    // cargo test test_enhance_run_1 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_1() {
        run_input(input_1()).await;
    }
}
