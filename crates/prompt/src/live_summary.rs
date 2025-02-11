type Input = hypr_bridge::LiveSummaryRequest;
type Output = hypr_bridge::LiveSummaryResponse;

impl crate::OpenAIRequest for Input {
    fn as_openai_request(&self) -> Result<hypr_openai::CreateChatCompletionRequest, crate::Error> {
        let schema = schemars::schema_for!(Output);
        let schema_value = serde_json::to_value(&schema)?;

        let system_prompt = crate::render(
            crate::Template::LiveSummarySystem,
            &crate::Context::from_serialize(self)?,
        )?;
        let user_prompt = crate::render(
            crate::Template::LiveSummaryUser,
            &crate::Context::from_serialize(self)?,
        )?;

        Ok(hypr_openai::CreateChatCompletionRequest {
            model: "meta-llama/llama-3.3-70b-instruct:nitro".to_string(),
            messages: vec![
                hypr_openai::ChatCompletionRequestSystemMessageArgs::default()
                    .content(system_prompt)
                    .build()
                    .unwrap()
                    .into(),
                hypr_openai::ChatCompletionRequestUserMessageArgs::default()
                    .content(user_prompt)
                    .build()
                    .unwrap()
                    .into(),
            ],
            response_format: Some(hypr_openai::ResponseFormat::JsonSchema {
                json_schema: hypr_openai::ResponseFormatJsonSchema {
                    name: "live_summary".to_string(),
                    description: None,
                    strict: Some(true),
                    schema: Some(schema_value),
                },
            }),
            temperature: Some(0.1),
            stream: Some(false),
            ..Default::default()
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{generate_tests, test_utils::default_config_with_language};

    fn input_01() -> Input {
        Input {
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::En),
            timeline_view: hypr_bridge::TimelineView { items: vec![] },
        }
    }

    // cargo test live_summary::tests::test_prompt_for_input_1 -p prompt --  --ignored
    #[ignore]
    #[test]
    fn test_prompt_for_input_1() {
        let input = input_01();

        let system_prompt = crate::render(
            crate::Template::LiveSummarySystem,
            &crate::Context::from_serialize(&input).unwrap(),
        )
        .unwrap();

        let user_prompt = crate::render(
            crate::Template::LiveSummaryUser,
            &crate::Context::from_serialize(&input).unwrap(),
        )
        .unwrap();

        crate::test_utils::print_prompt(system_prompt);
        crate::test_utils::print_prompt(user_prompt);
    }

    // cargo test -p prompt live_summary::tests
    generate_tests! {
        // cargo test live_summary::tests::test_input_<NN> -p prompt
        test_input_01 => input_01(),
    }
}
