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
                .content("You are a helpful assistant that only outputs Markdown. No code block, no explanation.")
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

    fn input_2() -> Input {
        let note = std::fs::read_to_string("data/2/note.md").unwrap();
        let transcript = transcript_from_path("data/2/conversation.json");

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

    fn input_3() -> Input {
        let note = std::fs::read_to_string("data/3/note.md").unwrap();
        let transcript = transcript_from_path("data/3/conversation.json");

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

    fn input_4() -> Input {
        let note = std::fs::read_to_string("data/4/note.md").unwrap();
        let transcript = transcript_from_path("data/4/conversation.json");

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

    fn input_5() -> Input {
        let note = std::fs::read_to_string("data/5/note.md").unwrap();
        let transcript = transcript_from_path("data/5/conversation.json");

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

    fn input_6() -> Input {
        let note = std::fs::read_to_string("data/6/note.md").unwrap();
        let transcript = transcript_from_path("data/6/conversation.json");

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

    fn input_7() -> Input {
        let note = std::fs::read_to_string("data/7/note.md").unwrap();
        let transcript = transcript_from_path("data/7/conversation.json");

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

    fn input_8() -> Input {
        let note = std::fs::read_to_string("data/8/note.md").unwrap();
        let transcript = transcript_from_path("data/8/conversation.json");

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

    fn input_9() -> Input {
        let note = std::fs::read_to_string("data/9/note.md").unwrap();
        let transcript = transcript_from_path("data/9/conversation.json");

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

    fn input_10() -> Input {
        let note = std::fs::read_to_string("data/10/note.md").unwrap();
        let transcript = transcript_from_path("data/10/conversation.json");

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

    fn input_11() -> Input {
        let note = std::fs::read_to_string("data/11/note.md").unwrap();
        let transcript = transcript_from_path("data/11/conversation.json");

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

    fn input_12() -> Input {
        let note = std::fs::read_to_string("data/12/note.md").unwrap();
        let transcript = transcript_from_path("data/12/conversation.json");

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

    fn input_13() -> Input {
        let note = std::fs::read_to_string("data/13/note.md").unwrap();
        let transcript = transcript_from_path("data/13/conversation.json");

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

    fn input_14() -> Input {
        let note = std::fs::read_to_string("data/14/note.md").unwrap();
        let transcript = transcript_from_path("data/14/conversation.json");

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

    fn input_15() -> Input {
        let note = std::fs::read_to_string("data/15/note.md").unwrap();
        let transcript = transcript_from_path("data/15/conversation.json");

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

    // cargo test test_enhance_run_3 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_3() {
        run_input(input_3()).await;
    }

    // cargo test test_enhance_run_4 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_4() {
        run_input(input_4()).await;
    }

    // cargo test test_enhance_run_5 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_5() {
        run_input(input_5()).await;
    }

    // cargo test test_enhance_run_6 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_6() {
        run_input(input_6()).await;
    }

    // cargo test test_enhance_run_7 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_7() {
        run_input(input_7()).await;
    }

    // cargo test test_enhance_run_8 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_8() {
        run_input(input_8()).await;
    }

    // cargo test test_enhance_run_9 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_9() {
        run_input(input_9()).await;
    }

    // cargo test test_enhance_run_10 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_10() {
        run_input(input_10()).await;
    }

    // cargo test test_enhance_run_11 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_11() {
        run_input(input_11()).await;
    }

    // cargo test test_enhance_run_12 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_12() {
        run_input(input_12()).await;
    }

    // cargo test test_enhance_run_13 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_13() {
        run_input(input_13()).await;
    }

    // cargo test test_enhance_run_14 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_14() {
        run_input(input_14()).await;
    }

    // cargo test test_enhance_run_15 -p prompt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_enhance_run_15() {
        run_input(input_15()).await;
    }
}
