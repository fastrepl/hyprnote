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

    fn input_1() -> Input {
        Input {
            template: hypr_template::standup(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: hypr_db::user::ConfigDataProfile::default(),
            transcript: hypr_db::user::Transcript::default(),
            editor: markdown::to_html(
                r#"openai 새로운 gpt-based 모델 관련 토론 진행

                - vs Anthropic?
                - 회사 방향성 관련 토론
                "#,
            ),
        }
    }

    fn input_2() -> Input {
        Input {
            template: hypr_template::kickoff(),
            config_general: hypr_db::user::ConfigDataGeneral::default(),
            config_profile: hypr_db::user::ConfigDataProfile::default(),
            transcript: hypr_db::user::Transcript::default(),
            editor: markdown::to_html(
                r#"## Another Test
                
                Different multi-line content
                for the second test case.
                
                1. With numbered
                2. List items
                3. Instead"#,
            ),
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

    // cargo test test_enhance_run_2 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_2() {
        run_input(input_2()).await;
    }
}
