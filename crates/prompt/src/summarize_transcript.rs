type Input = hypr_bridge::SummarizeTranscriptRequest;

impl crate::OpenAIRequest for Input {
    fn as_openai_request(&self) -> Result<hypr_openai::CreateChatCompletionRequest, crate::Error> {
        let system_prompt = crate::render(
            crate::Template::SummarizeTranscriptSystem,
            &crate::Context::from_serialize(self)?,
        )?;
        let user_prompt = crate::render(
            crate::Template::SummarizeTranscriptUser,
            &crate::Context::from_serialize(self)?,
        )?;

        Ok(hypr_openai::CreateChatCompletionRequest {
            model: "gpt-4o".to_string(),
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
                    name: "summarize_transcript".to_string(),
                    description: None,
                    strict: Some(true),
                    schema: Some(serde_json::json!({
                        "type": "object",
                        "properties": {
                            "blocks": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "points": {
                                            "type": "array",
                                            "items": { "type": "string" }
                                        }
                                    },
                                    "required": ["points"],
                                    "additionalProperties": false
                                }
                            }
                        },
                        "required": ["blocks"],
                        "additionalProperties": false
                    })),
                },
            }),
            temperature: Some(0.1),
            stream: Some(false),
            ..Default::default()
        })
    }
}
