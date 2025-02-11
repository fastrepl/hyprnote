type Input = hypr_bridge::PostprocessEnhanceRequest;

impl crate::OpenAIRequest for Input {
    fn as_openai_request(&self) -> Result<hypr_openai::CreateChatCompletionRequest, crate::Error> {
        let system_prompt = crate::render(
            crate::Template::PostprocessEnhanceSystem,
            &crate::Context::from_serialize(self)?,
        )?;
        let user_prompt = crate::render(
            crate::Template::PostprocessEnhanceUser,
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
            prediction: Some(hypr_openai::PredictionContent::Content(
                hypr_openai::PredictionContentContent::Text(self.editor.clone()),
            )),
            temperature: Some(0.1),
            stream: Some(false),
            ..Default::default()
        })
    }
}
