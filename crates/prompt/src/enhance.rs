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

    async fn run_input(input: Input) -> Result<(), crate::Error> {
        let openai = hypr_openai::OpenAIClient::builder()
            .api_base("https://api.openai.com/v1")
            .api_key(std::env::var("OPENAI_API_KEY").unwrap())
            .build();

        let req = request_from(&input)?;
        let res: hypr_openai::CreateChatCompletionResponse = openai
            .chat_completion(&req)
            .await
            .unwrap()
            .json()
            .await
            .unwrap();
        let content = res.choices[0].message.content.clone().unwrap();

        bat::PrettyPrinter::new()
            .language("markdown")
            .grid(true)
            .input_from_bytes(content.as_bytes())
            .print()
            .unwrap();

        Ok(())
    }

    fn input_01() -> Input {
        let note = std::fs::read_to_string("data/empty.md").unwrap();
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
        let note = std::fs::read_to_string("data/empty.md").unwrap();
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
        let note = std::fs::read_to_string("data/empty.md").unwrap();
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
        let note = std::fs::read_to_string("data/empty.md").unwrap();
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
        let note = std::fs::read_to_string("data/empty.md").unwrap();
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
        let note = std::fs::read_to_string("data/empty.md").unwrap();
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

    fn input_21() -> Input {
        let note = std::fs::read_to_string("data/01/note_a.md").unwrap();
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

    fn input_22() -> Input {
        let note = std::fs::read_to_string("data/02/note_a.md").unwrap();
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

    fn input_23() -> Input {
        let note = std::fs::read_to_string("data/03/note_a.md").unwrap();
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

    fn input_24() -> Input {
        let note = std::fs::read_to_string("data/04/note_a.md").unwrap();
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

    fn input_25() -> Input {
        let note = std::fs::read_to_string("data/05/note_a.md").unwrap();
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

    fn input_26() -> Input {
        let note = std::fs::read_to_string("data/06/note_a.md").unwrap();
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

    fn input_27() -> Input {
        let note = std::fs::read_to_string("data/07/note_a.md").unwrap();
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

    fn input_28() -> Input {
        let note = std::fs::read_to_string("data/08/note_a.md").unwrap();
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

    fn input_29() -> Input {
        let note = std::fs::read_to_string("data/09/note_a.md").unwrap();
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

    fn input_30() -> Input {
        let note = std::fs::read_to_string("data/10/note_a.md").unwrap();
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

    fn input_31() -> Input {
        let note = std::fs::read_to_string("data/11/note_a.md").unwrap();
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

    fn input_32() -> Input {
        let note = std::fs::read_to_string("data/12/note_a.md").unwrap();
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

    fn input_33() -> Input {
        let note = std::fs::read_to_string("data/13/note_a.md").unwrap();
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

    fn input_34() -> Input {
        let note = std::fs::read_to_string("data/14/note_a.md").unwrap();
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

    fn input_35() -> Input {
        let note = std::fs::read_to_string("data/15/note_a.md").unwrap();
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

    fn input_36() -> Input {
        let note = std::fs::read_to_string("data/16/note_a.md").unwrap();
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

    fn input_37() -> Input {
        let note = std::fs::read_to_string("data/17/note_a.md").unwrap();
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

    fn input_38() -> Input {
        let note = std::fs::read_to_string("data/18/note_a.md").unwrap();
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

    fn input_39() -> Input {
        let note = std::fs::read_to_string("data/19/note_a.md").unwrap();
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

    fn input_40() -> Input {
        let note = std::fs::read_to_string("data/20/note_a.md").unwrap();
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

    fn input_41() -> Input {
        let note = std::fs::read_to_string("data/01/note_b.md").unwrap();
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

    fn input_42() -> Input {
        let note = std::fs::read_to_string("data/02/note_b.md").unwrap();
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

    fn input_43() -> Input {
        let note = std::fs::read_to_string("data/03/note_b.md").unwrap();
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

    fn input_44() -> Input {
        let note = std::fs::read_to_string("data/04/note_b.md").unwrap();
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

    fn input_45() -> Input {
        let note = std::fs::read_to_string("data/05/note_b.md").unwrap();
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

    fn input_46() -> Input {
        let note = std::fs::read_to_string("data/06/note_b.md").unwrap();
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

    fn input_47() -> Input {
        let note = std::fs::read_to_string("data/07/note_b.md").unwrap();
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

    fn input_48() -> Input {
        let note = std::fs::read_to_string("data/08/note_b.md").unwrap();
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

    fn input_49() -> Input {
        let note = std::fs::read_to_string("data/09/note_b.md").unwrap();
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

    fn input_50() -> Input {
        let note = std::fs::read_to_string("data/10/note_b.md").unwrap();
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

    fn input_51() -> Input {
        let note = std::fs::read_to_string("data/11/note_b.md").unwrap();
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

    fn input_52() -> Input {
        let note = std::fs::read_to_string("data/12/note_b.md").unwrap();
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

    fn input_53() -> Input {
        let note = std::fs::read_to_string("data/13/note_b.md").unwrap();
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

    fn input_54() -> Input {
        let note = std::fs::read_to_string("data/14/note_b.md").unwrap();
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

    fn input_55() -> Input {
        let note = std::fs::read_to_string("data/15/note_b.md").unwrap();
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

    fn input_56() -> Input {
        let note = std::fs::read_to_string("data/16/note_b.md").unwrap();
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

    fn input_57() -> Input {
        let note = std::fs::read_to_string("data/17/note_b.md").unwrap();
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

    fn input_58() -> Input {
        let note = std::fs::read_to_string("data/18/note_b.md").unwrap();
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

    fn input_59() -> Input {
        let note = std::fs::read_to_string("data/19/note_b.md").unwrap();
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

    fn input_60() -> Input {
        let note = std::fs::read_to_string("data/20/note_b.md").unwrap();
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

    fn input_61() -> Input {
        let note = std::fs::read_to_string("data/01/note_c.md").unwrap();
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

    fn input_62() -> Input {
        let note = std::fs::read_to_string("data/02/note_c.md").unwrap();
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

    fn input_63() -> Input {
        let note = std::fs::read_to_string("data/03/note_c.md").unwrap();
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

    fn input_64() -> Input {
        let note = std::fs::read_to_string("data/04/note_c.md").unwrap();
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

    fn input_65() -> Input {
        let note = std::fs::read_to_string("data/05/note_c.md").unwrap();
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

    fn input_66() -> Input {
        let note = std::fs::read_to_string("data/06/note_c.md").unwrap();
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

    fn input_67() -> Input {
        let note = std::fs::read_to_string("data/07/note_c.md").unwrap();
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

    fn input_68() -> Input {
        let note = std::fs::read_to_string("data/08/note_c.md").unwrap();
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

    fn input_69() -> Input {
        let note = std::fs::read_to_string("data/09/note_c.md").unwrap();
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

    fn input_70() -> Input {
        let note = std::fs::read_to_string("data/10/note_c.md").unwrap();
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

    fn input_71() -> Input {
        let note = std::fs::read_to_string("data/11/note_c.md").unwrap();
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

    fn input_72() -> Input {
        let note = std::fs::read_to_string("data/12/note_c.md").unwrap();
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

    fn input_73() -> Input {
        let note = std::fs::read_to_string("data/13/note_c.md").unwrap();
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

    fn input_74() -> Input {
        let note = std::fs::read_to_string("data/14/note_c.md").unwrap();
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

    fn input_75() -> Input {
        let note = std::fs::read_to_string("data/15/note_c.md").unwrap();
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

    fn input_76() -> Input {
        let note = std::fs::read_to_string("data/16/note_c.md").unwrap();
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

    fn input_77() -> Input {
        let note = std::fs::read_to_string("data/17/note_c.md").unwrap();
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

    fn input_78() -> Input {
        let note = std::fs::read_to_string("data/18/note_c.md").unwrap();
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

    fn input_79() -> Input {
        let note = std::fs::read_to_string("data/19/note_c.md").unwrap();
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

    fn input_80() -> Input {
        let note = std::fs::read_to_string("data/20/note_c.md").unwrap();
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
                #[test]
                fn $test_name() -> Result<(), crate::Error> {
                    let input = $input_expr;
                    run_input(input)
                }
            )*
        };
    }

    generate! {
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
        test_input_21 => input_21(),
        test_input_22 => input_22(),
        test_input_23 => input_23(),
        test_input_24 => input_24(),
        test_input_25 => input_25(),
        test_input_26 => input_26(),
        test_input_27 => input_27(),
        test_input_28 => input_28(),
        test_input_29 => input_29(),
        test_input_30 => input_30(),
        test_input_31 => input_31(),
        test_input_32 => input_32(),
        test_input_33 => input_33(),
        test_input_34 => input_34(),
        test_input_35 => input_35(),
        test_input_36 => input_36(),
        test_input_37 => input_37(),
        test_input_38 => input_38(),
        test_input_39 => input_39(),
        test_input_40 => input_40(),
        test_input_41 => input_41(),
        test_input_42 => input_42(),
        test_input_43 => input_43(),
        test_input_44 => input_44(),
        test_input_45 => input_45(),
        test_input_46 => input_46(),
        test_input_47 => input_47(),
        test_input_48 => input_48(),
        test_input_49 => input_49(),
        test_input_50 => input_50(),
        test_input_51 => input_51(),
        test_input_52 => input_52(),
        test_input_53 => input_53(),
        test_input_54 => input_54(),
        test_input_55 => input_55(),
        test_input_56 => input_56(),
        test_input_57 => input_57(),
        test_input_58 => input_58(),
        test_input_59 => input_59(),
        test_input_60 => input_60(),
        test_input_61 => input_61(),
        test_input_62 => input_62(),
        test_input_63 => input_63(),
        test_input_64 => input_64(),
        test_input_65 => input_65(),
        test_input_66 => input_66(),
        test_input_67 => input_67(),
        test_input_68 => input_68(),
        test_input_69 => input_69(),
        test_input_70 => input_70(),
        test_input_71 => input_71(),
        test_input_72 => input_72(),
        test_input_73 => input_73(),
        test_input_74 => input_74(),
        test_input_75 => input_75(),
        test_input_76 => input_76(),
        test_input_77 => input_77(),
        test_input_78 => input_78(),
        test_input_79 => input_79(),
        test_input_80 => input_80(),
    }
}
