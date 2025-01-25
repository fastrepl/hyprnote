#![allow(unused)]
type Input = hypr_bridge::EnhanceRequest;

pub fn request_from(
    input: &Input,
) -> Result<hypr_openai::CreateChatCompletionRequest, crate::Error> {
    let system_prompt = crate::render(
        crate::Template::EnhanceSystem,
        &crate::Context::from_serialize(input)?,
    )?;
    let user_prompt = crate::render(
        crate::Template::EnhanceUser,
        &crate::Context::from_serialize(input)?,
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
        temperature: Some(0.1),
        stream: Some(false),
        ..Default::default()
    })
}

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

    async fn run_input(label: impl std::fmt::Display, input: Input) {
        dotenv::from_filename(".env.local").unwrap();

        let openai = hypr_openai::OpenAIClient::builder()
            .api_base(
                std::env::var("OPENAI_API_BASE")
                    .map_err(|_| "'OPENAI_API_BASE' not set")
                    .unwrap(),
            )
            .api_key(
                std::env::var("OPENAI_API_KEY")
                    .map_err(|_| "'OPENAI_API_KEY' not set")
                    .unwrap(),
            )
            .build();

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let req = request_from(&input).unwrap();
        let res: hypr_openai::CreateChatCompletionResponse = openai
            .chat_completion(&req)
            .await
            .unwrap()
            .json()
            .await
            .unwrap();
        let content = res.choices[0].message.content.clone().unwrap();

        let mut ctx = tera::Context::new();
        ctx.insert("request", &req);
        ctx.insert("response", &res);
        let html = crate::render(crate::Template::Preview, &ctx).unwrap();
        let path = format!("./out/{}/{}.html", label, now);
        if let Some(parent) = std::path::Path::new(&path).parent() {
            std::fs::create_dir_all(parent).unwrap();
        }
        std::fs::write(&path, html).unwrap();
    }

    fn input_01() -> Input {
        let note = std::fs::read_to_string("data/01/note.md").unwrap();
        let transcript = transcript_from_path("data/01/conversation.json");

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

    fn input_02() -> Input {
        let note = std::fs::read_to_string("data/02/note.md").unwrap();
        let transcript = transcript_from_path("data/02/conversation.json");

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

    fn input_03() -> Input {
        let note = std::fs::read_to_string("data/03/note.md").unwrap();
        let transcript = transcript_from_path("data/03/conversation.json");

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

    fn input_04() -> Input {
        let note = std::fs::read_to_string("data/empty.md").unwrap();
        let transcript = transcript_from_path("data/04/conversation.json");

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

    fn input_05() -> Input {
        let note = std::fs::read_to_string("data/05/note.md").unwrap();
        let transcript = transcript_from_path("data/05/conversation.json");

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

    fn input_06() -> Input {
        let note = std::fs::read_to_string("data/empty.md").unwrap();
        let transcript = transcript_from_path("data/06/conversation.json");

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

    fn input_07() -> Input {
        let note = std::fs::read_to_string("data/07/note.md").unwrap();
        let transcript = transcript_from_path("data/07/conversation.json");

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

    fn input_08() -> Input {
        let note = std::fs::read_to_string("data/empty.md").unwrap();
        let transcript = transcript_from_path("data/08/conversation.json");

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

    fn input_09() -> Input {
        let note = std::fs::read_to_string("data/empty.md").unwrap();
        let transcript = transcript_from_path("data/09/conversation.json");

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
        let note = std::fs::read_to_string("data/empty.md").unwrap();
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
        let note = std::fs::read_to_string("data/empty.md").unwrap();
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
        let note = std::fs::read_to_string("data/empty.md").unwrap();
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
        let note = std::fs::read_to_string("data/empty.md").unwrap();
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
        let note = std::fs::read_to_string("data/empty.md").unwrap();
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

    fn input_16() -> Input {
        let note = std::fs::read_to_string("data/empty.md").unwrap();
        let transcript = transcript_from_path("data/16/conversation.json");

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

    fn input_17() -> Input {
        let note = std::fs::read_to_string("data/empty.md").unwrap();
        let transcript = transcript_from_path("data/17/conversation.json");

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

    fn input_18() -> Input {
        let note = std::fs::read_to_string("data/empty.md").unwrap();
        let transcript = transcript_from_path("data/18/conversation.json");

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

    fn input_19() -> Input {
        let note = std::fs::read_to_string("data/empty.md").unwrap();
        let transcript = transcript_from_path("data/19/conversation.json");

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

    fn input_20() -> Input {
        let note = std::fs::read_to_string("data/empty.md").unwrap();
        let transcript = transcript_from_path("data/20/conversation.json");

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

    macro_rules! generate {
        ( $( $test_name:ident => $input_expr:expr ),+ $(,)? ) => {
            $(
                #[tokio::test]
                async fn $test_name() {
                    run_input(stringify!($test_name), $input_expr).await;
                }
            )+
        }
    }

    // cargo test -p prompt enhance::tests -- --include-ignored --test-threads=4
    generate! {
        // cargo test test_input_<N> -p prompt --  --ignored
        test_input_01 => input_01(),
        test_input_02 => input_02(),
        test_input_03 => input_03(),
        test_input_04 => input_04(),
        test_input_05 => input_05(),
        test_input_06 => input_06(),
        test_input_07 => input_07(),
        test_input_08 => input_08(),
        test_input_09 => input_09(),
        test_input_10 => input_10(),
        test_input_11 => input_11(),
        test_input_12 => input_12(),
        test_input_13 => input_13(),
        test_input_14 => input_14(),
        test_input_15 => input_15(),
        test_input_16 => input_16(),
        test_input_17 => input_17(),
        test_input_18 => input_18(),
        test_input_19 => input_19(),
        test_input_20 => input_20(),
    }
}
