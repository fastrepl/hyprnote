type Input = hypr_bridge::EnhanceRequest;

impl crate::OpenAIRequest for Input {
    fn as_openai_request(&self) -> Result<hypr_openai::CreateChatCompletionRequest, crate::Error> {
        let system_prompt = crate::render(
            crate::Template::EnhanceSystem,
            &crate::Context::from_serialize(self)?,
        )?;
        let user_prompt = crate::render(
            crate::Template::EnhanceUser,
            &crate::Context::from_serialize(self)?,
        )?;

        Ok(hypr_openai::CreateChatCompletionRequest {
            model: "chatgpt-4o-latest".to_string(),
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

    const EMPTY_NOTE: &str = "";

    // TODO
    // fn default_profile() -> hypr_db::user::ConfigDataProfile {
    //     hypr_db::user::ConfigDataProfile {
    //         full_name: Some("정지헌".to_string()),
    //         job_title: Some("CEO".to_string()),
    //         company_name: Some("파도".to_string()),
    //         company_description: Some("증권정보업".to_string()),
    //         linkedin_username: None,
    //     }
    // }

    fn default_config_with_language(
        language: codes_iso_639::part_1::LanguageCode,
    ) -> hypr_db::user::Config {
        hypr_db::user::Config {
            id: "".to_string(),
            user_id: "".to_string(),
            general: hypr_db::user::ConfigGeneral {
                speech_language: language,
                display_language: language,
                ..Default::default()
            },
            notification: hypr_db::user::ConfigNotification::default(),
        }
    }

    fn timeline_view_from_path(p: &str) -> hypr_bridge::TimelineView {
        let data = std::fs::read_to_string(p).unwrap();
        let value: serde_json::Value = serde_json::from_str(&data).unwrap();
        let items: Vec<hypr_bridge::TimelineViewItem> = value["conversation"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| serde_json::from_value(v.clone()).unwrap())
            .collect();

        hypr_bridge::TimelineView { items }
    }

    fn participants_from_path(p: &str) -> Vec<hypr_db::user::Human> {
        let timeline_view = timeline_view_from_path(p);

        timeline_view
            .items
            .iter()
            .map(|item| item.speaker.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .map(|name| hypr_db::user::Human {
                full_name: Some(name),
                ..Default::default()
            })
            .collect()
    }

    fn input_01() -> Input {
        let note_pre = std::fs::read_to_string("data/01/note_pre.md").unwrap();
        let note_during = std::fs::read_to_string("data/01/note_during.md").unwrap();
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/01/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note_during),
            pre_meeting_editor: markdown::to_html(&note_pre),
            timeline_view,
            event: Some(hypr_db::user::Event {
                id: "".to_string(),
                user_id: "".to_string(),
                tracking_id: "".to_string(),
                calendar_id: "".to_string(),
                note: "".to_string(),
                start_date: {
                    let local: chrono::DateTime<chrono::FixedOffset> =
                        chrono::DateTime::from_naive_utc_and_offset(
                            chrono::NaiveDateTime::new(
                                chrono::NaiveDate::from_ymd_opt(2024, 6, 20).unwrap(),
                                chrono::NaiveTime::from_hms_opt(13, 30, 0).unwrap(),
                            ),
                            chrono::offset::FixedOffset::east_opt(9 * 3600).unwrap(),
                        );
                    local.with_timezone(&chrono::Utc)
                },
                end_date: {
                    let local: chrono::DateTime<chrono::FixedOffset> =
                        chrono::DateTime::from_naive_utc_and_offset(
                            chrono::NaiveDateTime::new(
                                chrono::NaiveDate::from_ymd_opt(2024, 6, 20).unwrap(),
                                chrono::NaiveTime::from_hms_opt(15, 20, 0).unwrap(),
                            ),
                            chrono::offset::FixedOffset::east_opt(9 * 3600).unwrap(),
                        );
                    local.with_timezone(&chrono::Utc)
                },
                google_event_url: None,
                name: "이지스자산운용 박택영 팀장님 커피챗".to_string(),
            }),
            participants,
        }
    }

    fn input_02() -> Input {
        let note = std::fs::read_to_string("data/02/note.md").unwrap();
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/02/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_03() -> Input {
        let note = std::fs::read_to_string("data/03/note.md").unwrap();
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/03/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_04() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/04/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_05() -> Input {
        let note = std::fs::read_to_string("data/05/note.md").unwrap();
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/05/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_06() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/06/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_07() -> Input {
        let note = std::fs::read_to_string("data/07/note.md").unwrap();
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/07/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_08() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/08/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_09() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/09/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_10() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/10/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_11() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/11/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_12() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/12/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_13() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/13/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_14() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/14/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_15() -> Input {
        let note = std::fs::read_to_string("data/15/note.md").unwrap();
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/15/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_16() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/16/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_17() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/17/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_18() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/18/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_19() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/19/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    fn input_20() -> Input {
        let note = EMPTY_NOTE;
        let timeline_view = timeline_view_from_path("data/01/conversation.json");
        let participants = participants_from_path("data/20/conversation.json");

        Input {
            template: hypr_template::auto(),
            config: default_config_with_language(codes_iso_639::part_1::LanguageCode::Ko),
            in_meeting_editor: markdown::to_html(&note),
            pre_meeting_editor: markdown::to_html(EMPTY_NOTE),
            timeline_view,
            event: None,
            participants,
        }
    }

    // cargo test enhance::tests::test_prompt_for_input_1 -p prompt --  --ignored
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

        crate::test_utils::print_prompt(system_prompt);
        crate::test_utils::print_prompt(user_prompt);
    }

    // cargo test -p prompt enhance::tests
    generate_tests! {
        // cargo test enhance::tests::test_input_<NN> -p prompt
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
