#![allow(unused)]
type Input = hypr_bridge::CreateTitleRequest;

impl crate::OpenAIRequest for Input {
    fn as_openai_request(&self) -> Result<hypr_openai::CreateChatCompletionRequest, crate::Error> {
        let system_prompt = crate::render(
            crate::Template::CreateTitleSystem,
            &crate::Context::from_serialize(self)?,
        )?;
        let user_prompt = crate::render(
            crate::Template::CreateTitleUser,
            &crate::Context::from_serialize(self)?,
        )?;

        Ok(hypr_openai::CreateChatCompletionRequest {
            model: "gpt-4o-mini".to_string(),
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
            temperature: Some(0.1),
            stream: Some(false),
            ..Default::default()
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{generate_tests, OpenAIRequest};

    fn input_01() -> Input {
        Input {
            transcripts: vec![],
        }
    }

    // cargo test create_title::tests::test_prompt_for_input_1 -p prompt --  --ignored
    #[ignore]
    #[test]
    fn test_prompt_for_input_1() {
        let input = input_01();

        let system_prompt = crate::render(
            crate::Template::CreateTitleSystem,
            &crate::Context::from_serialize(&input).unwrap(),
        )
        .unwrap();

        let user_prompt = crate::render(
            crate::Template::CreateTitleUser,
            &crate::Context::from_serialize(&input).unwrap(),
        )
        .unwrap();

        crate::test_utils::print_prompt(system_prompt);
        crate::test_utils::print_prompt(user_prompt);
    }

    // cargo test -p prompt create_title::tests
    generate_tests! {
        // cargo test create_title::tests::test_input_<NN> -p prompt
        test_input_01 => input_01(),
    }
}
