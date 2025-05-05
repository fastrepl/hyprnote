mod commands;
mod ext;
pub use ext::*;

const PLUGIN_NAME: &str = "misc";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::get_git_hash::<tauri::Wry>,
            commands::get_fingerprint::<tauri::Wry>,
            commands::opinionated_md_to_html::<tauri::Wry>,
            commands::open_audio::<tauri::Wry>,
            commands::delete_session_folder::<tauri::Wry>,
            commands::parse_meeting_link::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        make_specta_builder::<tauri::Wry>()
            .export(
                specta_typescript::Typescript::default()
                    .header("// @ts-nocheck\n\n")
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                "./js/bindings.gen.ts",
            )
            .unwrap()
    }

    fn create_app<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::App<R> {
        builder
            .plugin(init())
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap()
    }

    #[test]
    fn test_parse_meeting_link() {
        let app = create_app(tauri::test::mock_builder());

        struct TestCase {
            name: &'static str,
            input: &'static str,
            expected: &'static str,
        }

        let test_cases = vec![
            TestCase {
                name: "cal.com link",
                input: indoc::indoc! {r#"
                    What:
                    30 Min Meeting between Alice Smith and Bob Johnson
                    Invitee Time Zone:
                    Asia/Seoul
                    Who:
                    Alice Smith - Organizer
                    alice.smith@example.com
                    Bob Johnson
                    bob.johnson@example.com
                    Where:
                    https://app.cal.com/video/d713v9w1d2krBptPtwUAnJ
                    Need to reschedule or cancel? https://cal.com/booking/d713v9w1d2krBptPtwUAnJ?changes=true
                "#},
                expected: "https://app.cal.com/video/d713v9w1d2krBptPtwUAnJ",
            },
            TestCase {
                name: "zoom link",
                input: indoc::indoc! {r#"
                    What:
                    Let's chat! between Alice Smith and Charlie Davis
                    Invitee Time Zone:
                    Asia/Seoul
                    Who:
                    Alice Smith - Organizer
                    alice.smith@example.com
                    Charlie Davis
                    charlie.davis@example.com
                    Where:
                    https://us05web.zoom.us/j/87636383039?pwd=NOWbxkY9GNblR0yaLKaIzcy76IWRoj.1
                    Description
                    ****Hey, I'm Alice, co-founder of Hyprnote.****
                    Thanks for taking the time to visit this page—excited that you're booking a call with me.
                    Looking forward to chatting soon!
                    Best,
                    Alice
                    Need to reschedule or cancel? https://cal.com/booking/dnHcnBV5RX8Jp3iq2E2QTe?changes=true
                "#},
                expected:
                    "https://us05web.zoom.us/j/87636383039?pwd=NOWbxkY9GNblR0yaLKaIzcy76IWRoj.1",
            },
            TestCase {
                name: "google meet link",
                input: indoc::indoc! {r#"
                    https://meet.google.com/xhv-ubut-zph
                    tel:+1%20650-817-8427;205595809%23
                    전화번호 더보기: https://tel.meet/xhv-ubut-zph?pin=4030200140074&hs=7
                    https://support.google.com/a/users/answer/9282720에서 Meet에 대해 자세히 알아보세요.
                    이 섹션을 수정하지 마시기 바랍니다.
                "#},
                expected: "https://meet.google.com/xhv-ubut-zph",
            },
        ];

        for test_case in test_cases {
            let result = app.parse_meeting_link(test_case.input);
            assert_eq!(
                result,
                Some(test_case.expected.to_string()),
                "Failed test case: {}",
                test_case.name
            );
        }
    }
}
