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

    const EMPTY_NOTE: &str = "";

    fn default_profile() -> hypr_db::user::ConfigDataProfile {
        hypr_db::user::ConfigDataProfile {
            full_name: Some("정지헌".to_string()),
            job_title: Some("CEO".to_string()),
            company_name: Some("파도".to_string()),
            company_description: Some("증권정보업".to_string()),
            linkedin_username: None,
        }
    }

    fn read_conversation(p: impl AsRef<std::path::Path>) -> Vec<ConversationItem> {
        let data = std::fs::read_to_string(p).unwrap();
        let value: serde_json::Value = serde_json::from_str(&data).unwrap();
        let conversation: Vec<ConversationItem> = value["conversation"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| serde_json::from_value(v.clone()).unwrap())
            .collect();

        conversation
    }

    fn diarizations_from_path(p: &str) -> Vec<hypr_db::user::DiarizationBlock> {
        let conversation = read_conversation(p);

        conversation
            .into_iter()
            .map(|item| hypr_db::user::DiarizationBlock {
                start: item.start as i32,
                end: item.end as i32,
                label: item.speaker.clone(),
            })
            .collect()
    }

    fn transcripts_from_path(p: &str) -> Vec<hypr_db::user::TranscriptBlock> {
        let conversation = read_conversation(p);

        conversation
            .into_iter()
            .map(|item| hypr_db::user::TranscriptBlock {
                start: item.start as i32,
                end: item.end as i32,
                text: item.text.clone(),
            })
            .collect()
    }

    fn participants_from_path(p: &str) -> Vec<hypr_db::user::Participant> {
        let conversation = read_conversation(p);

        conversation
            .into_iter()
            .map(|item| item.speaker)
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .map(|name| hypr_db::user::Participant {
                name,
                ..Default::default()
            })
            .collect()
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
        let note_pre = std::fs::read_to_string("data/01/note_pre.md").unwrap();
        let note_during = std::fs::read_to_string("data/01/note_during.md").unwrap();
        let transcripts = transcripts_from_path("data/01/conversation.json");
        let diarizations = diarizations_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/01/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note_during),
            pre_meeting_editor: markdown::to_html(&note_pre),
            transcripts,
            diarizations,
            event: Some(hypr_db::user::Event {
                id: "".to_string(),
                tracking_id: "".to_string(),
                calendar_id: "".to_string(),
                note: "".to_string(),
                start_date: time::OffsetDateTime::new_in_offset(
                    time::Date::from_calendar_date(2024, time::Month::June, 20).unwrap(),
                    time::Time::from_hms(13, 30, 0).unwrap(),
                    time::UtcOffset::from_hms(9, 0, 0).unwrap(),
                ),
                end_date: time::OffsetDateTime::new_in_offset(
                    time::Date::from_calendar_date(2024, time::Month::June, 20).unwrap(),
                    time::Time::from_hms(15, 20, 0).unwrap(),
                    time::UtcOffset::from_hms(9, 0, 0).unwrap(),
                ),
                google_event_url: None,
                name: "이지스자산운용 박택영 팀장님 커피챗".to_string(),
            }),
            participants,
        }
    }

    fn input_02() -> Input {
        let note = std::fs::read_to_string("data/02/note.md").unwrap();
        let transcripts = transcripts_from_path("data/02/conversation.json");
        let diarizations = diarizations_from_path("data/02/conversation.json");
        let participants = participants_from_path("data/02/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_03() -> Input {
        let note = std::fs::read_to_string("data/03/note.md").unwrap();
        let transcripts = transcripts_from_path("data/03/conversation.json");
        let diarizations = diarizations_from_path("data/03/conversation.json");
        let participants = participants_from_path("data/03/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_04() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/04/conversation.json");
        let diarizations = diarizations_from_path("data/04/conversation.json");
        let participants = participants_from_path("data/04/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_05() -> Input {
        let note = std::fs::read_to_string("data/05/note.md").unwrap();
        let transcripts = transcripts_from_path("data/05/conversation.json");
        let diarizations = diarizations_from_path("data/05/conversation.json");
        let participants = participants_from_path("data/05/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_06() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/06/conversation.json");
        let diarizations = diarizations_from_path("data/06/conversation.json");
        let participants = participants_from_path("data/06/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_07() -> Input {
        let note = std::fs::read_to_string("data/07/note.md").unwrap();
        let transcripts = transcripts_from_path("data/07/conversation.json");
        let diarizations = diarizations_from_path("data/07/conversation.json");
        let participants = participants_from_path("data/07/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_08() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/08/conversation.json");
        let diarizations = diarizations_from_path("data/08/conversation.json");
        let participants = participants_from_path("data/08/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_09() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/09/conversation.json");
        let diarizations = diarizations_from_path("data/09/conversation.json");
        let participants = participants_from_path("data/09/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_10() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/10/conversation.json");
        let diarizations = diarizations_from_path("data/10/conversation.json");
        let participants = participants_from_path("data/10/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants: vec![],
        }
    }

    fn input_11() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/11/conversation.json");
        let diarizations = diarizations_from_path("data/11/conversation.json");
        let participants = participants_from_path("data/11/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_12() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/12/conversation.json");
        let diarizations = diarizations_from_path("data/12/conversation.json");
        let participants = participants_from_path("data/12/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_13() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/13/conversation.json");
        let diarizations = diarizations_from_path("data/13/conversation.json");
        let participants = participants_from_path("data/13/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_14() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/14/conversation.json");
        let diarizations = diarizations_from_path("data/14/conversation.json");
        let participants = participants_from_path("data/14/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_15() -> Input {
        // let note = EMPTY_NOTE;
        let note = std::fs::read_to_string("data/15/note.md").unwrap();
        let transcripts = transcripts_from_path("data/15/conversation.json");
        let diarizations = diarizations_from_path("data/15/conversation.json");
        let participants = participants_from_path("data/15/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_16() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/16/conversation.json");
        let diarizations = diarizations_from_path("data/16/conversation.json");
        let participants = participants_from_path("data/16/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_17() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/17/conversation.json");
        let diarizations = diarizations_from_path("data/17/conversation.json");
        let participants = participants_from_path("data/17/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_18() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/18/conversation.json");
        let diarizations = diarizations_from_path("data/18/conversation.json");
        let participants = participants_from_path("data/18/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    fn input_19() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/19/conversation.json");
        let diarizations = diarizations_from_path("data/19/conversation.json");
        let participants = participants_from_path("data/19/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants: vec![],
        }
    }

    fn input_20() -> Input {
        let note = EMPTY_NOTE;
        let transcripts = transcripts_from_path("data/20/conversation.json");
        let diarizations = diarizations_from_path("data/20/conversation.json");
        let participants = participants_from_path("data/20/conversation.json");

        Input {
            template: hypr_template::auto(),
            config_general: hypr_db::user::ConfigDataGeneral {
                language: codes_iso_639::part_1::LanguageCode::Ko,
                ..Default::default()
            },
            config_profile: default_profile(),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            transcripts,
            diarizations,
            event: None,
            participants,
        }
    }

    // cargo test test_prompt_for_input_1 -p prompt --  --ignored
    #[ignore]
    #[test]
    fn test_prompt_for_input_1() {
        let input = input_01();

        let system_prompt = crate::render(
            crate::Template::EnhanceSystem,
            &crate::Context::from_serialize(&input).unwrap(),
        )
        .unwrap();

        let user_prompt = crate::render(
            crate::Template::EnhanceUser,
            &crate::Context::from_serialize(&input).unwrap(),
        )
        .unwrap();

        bat::PrettyPrinter::new()
            .grid(true)
            .language("markdown")
            .input_from_bytes(system_prompt.as_bytes())
            .print()
            .unwrap();

        bat::PrettyPrinter::new()
            .grid(true)
            .language("markdown")
            .input_from_bytes(user_prompt.as_bytes())
            .print()
            .unwrap();
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

    // cargo test -p prompt enhance::tests
    generate! {
        // cargo test test_input_<N> -p prompt
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
