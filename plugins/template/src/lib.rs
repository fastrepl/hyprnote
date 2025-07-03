use std::sync::Mutex;
use tauri::{Manager, Wry};

mod commands;
mod ext;

pub use ext::TemplatePluginExt;

const PLUGIN_NAME: &str = "template";

pub type ManagedState = Mutex<State>;

pub struct State {
    env: hypr_template::minijinja::Environment<'static>,
}

impl Default for State {
    fn default() -> Self {
        Self {
            env: hypr_template::minijinja::Environment::new(),
        }
    }
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::render::<Wry>,
            commands::register_template::<Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let mut state = State::default();
            hypr_template::init(&mut state.env);
            app.manage(Mutex::new(state));
            Ok(())
        })
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

    fn render_enhance_system_template<R: tauri::Runtime>(
        app: &tauri::App<R>,
        connection: impl AsRef<str>,
    ) -> String {
        app.render(
            hypr_template::PredefinedTemplate::EnhanceSystem,
            serde_json::json!({
                "type": connection.as_ref(),
                "config": {
                    "general": {
                        "display_language": "en"
                    }
                }
            })
            .as_object()
            .unwrap()
            .clone(),
        )
        .unwrap()
    }

    fn render_enhance_user_template<R: tauri::Runtime>(
        app: &tauri::App<R>,
        connection: impl AsRef<str>,
    ) -> String {
        app.render(
            hypr_template::PredefinedTemplate::EnhanceUser,
            serde_json::json!({
                "type": connection.as_ref(),
                "words": [],
                "participants": [],
                "editor": "",
            })
            .as_object()
            .unwrap()
            .clone(),
        )
        .unwrap()
    }

    #[test]
    fn test_enhance_system() {
        let app = create_app(tauri::test::mock_builder());

        assert!(!render_enhance_system_template(&app, "HyprLocal").is_empty());
        assert!(!render_enhance_system_template(&app, "HyprCloud").is_empty());
        assert!(!render_enhance_system_template(&app, "Custom").is_empty());

        assert_ne!(
            render_enhance_system_template(&app, "HyprLocal"),
            render_enhance_system_template(&app, "HyprCloud"),
        );

        insta::assert_snapshot!(render_enhance_system_template(&app, "HyprLocal"), @r###"
        You are a professional assistant that generates enhanced meetings notes while maintaining accuracy, completeness, and professional terminology in English.


        Always output markdown, without any other responses.
        "###);

        insta::assert_snapshot!(render_enhance_system_template(&app, "HyprCloud"), @r"
        You are a professional assistant that generates enhanced meetings notes while maintaining accuracy, completeness, and professional terminology in English.


        You will be given multiple inputs from the user. Below are useful information that you will use to write the best enhanced meeting note. Think step by step.

        # Inputs Provided by the user

        - Meeting Information (txt)
        - Raw Note (txt)
        - Meeting Transcript (txt)

        # About Raw Notes

        - Raw Notes is what user purely wrote during the meeting.
        - The beginning of a raw note may include agenda items, discussion topics, and preliminary questions.
        - Primarily consist of key phrases or sentences the user wants to remember, though they may also contain random or extraneous words.
        - May sometimes be empty.

        # Enhanced Note Format

        - Use Markdown format without code block wrappers.
        - Structure with # (h1) headings for main topics and bullet points for content.
        - Organize into sections, each starting with an h1 heading, followed by unordered lists.
        - Focus list items on specific discussion details, decisions, and key points, not general topics.
        - Keep list items specific. Focus on discussion details, decisions, and key points rather than general topics.
        - Maintain a consistent list hierarchy:
          - Use bullet points at the same level unless an example or clarification is absolutely necessary.
          - Avoid nesting lists beyond one level of indentation.
          - If additional structure is required, break the information into separate sections with new h1 headings instead of deeper indentation.
        - Write the enhanced note in English.

        # Guidelines for Creating an Enhanced Note

        - Disclaimer: Raw notes and the transcript may contain errors made by human and STT, respectively. So it is important you make the best out of every material to create the best enhanced meeting note.
        - Do not include meeting note title, attendee lists nor explanatory notes about the output structure. Just print a markdown document.
        - It is super important to acknowledge what the user found to be important, and raw notes show a glimpse of the important information as well as moments during the meeting. Naturally integrate raw note entries into relevant sections instead of forcefully converting them into headers.
        - Preserve essential details; avoid excessive abstraction. Ensure content remains concrete and specific.
        - Pay close attention to emphasized text in raw notes. Users highlight information using four styles: bold(**text**), italic(_text_), underline(<u>text</u>), strikethrough(~~text~~).
        - Recognize H3 headers (### Header) in raw notes—these indicate highly important topics that the user wants to retain no matter what.
          
          

        # Correct Examples of a Section

        ## Example 1

        ```
        # Market Evolution Patterns
        - Historical pattern: New technologies often start with consumer/long-tail use cases before enterprise adoption
        - Examples of this pattern:
          - PCs: Started with consumer market before enterprise adoption
          - Mobile: Began as niche market (BlackBerry) before mainstream
          - Initial versions often have lower quality compared to traditional solutions
        - Market maturation typically follows:
          - Organic consumer adoption with long-tail use cases
          - Quality improvements as industry matures
          - Enterprise adoption follows as solutions become more sophisticated
        ```

        ## Example 2

        ```
        # Big Platform Shifts
        - Startups excel during major platform shifts
        - Agility allows startups to capitalize on rapid changes
        - Example: Rise of mobile apps post-iPhone launch
        ```

        ## Example 3

        ```
        # Creative mornings
        - Dan does not schedule meetings before noon so he can focus on creative work during his most productive hours.
        - He wakes up at 7 AM, has coffee, reads, and starts writing. This routine ensures he dives straight into his most important tasks without distractions.
        ```

        ## Example 4

        ```
        # Market-Specific Challenges (Robotics Case Study)
        - Robotics Market Challenges:
          - Highly fragmented market
          - Multiple software layers required
          - Limited standardization across industry
        - Strategic Approaches:
          - Focus on specific verticals (e.g., warehouses, construction)
          - Consider government/project-based work
          - Need high-ticket items for sustainability
          - Importance of finding strong strategic partners
        ```
        ");
    }

    #[test]
    fn test_enhance_user() {
        let app = create_app(tauri::test::mock_builder());

        assert!(!render_enhance_user_template(&app, "HyprLocal").is_empty());
        assert!(!render_enhance_user_template(&app, "HyprCloud").is_empty());
        assert!(!render_enhance_user_template(&app, "Custom").is_empty());

        assert_ne!(
            render_enhance_user_template(&app, "HyprLocal"),
            render_enhance_user_template(&app, "HyprCloud"),
        );

        insta::assert_snapshot!(render_enhance_user_template(&app, "HyprLocal"), @r"
        <participants>

        </participants>

        <raw_note>

        </raw_note>

        <transcript>

        </transcript>

        Your job is to write a perfect note based on the above informations.
        Note that above given informations like participants, transcript, etc. are already displayed in the UI, so you don't need to repeat them.


        Also, before writing enhanced note, write multiple top-level headers inside <thinking></thinking> tags, and then write the note based on the headers.

        Each items in <thinking></thinking> tags MUST be used as markdown headers('#') in the final note. No other headers are allowed.
        ");

        insta::assert_snapshot!(render_enhance_user_template(&app, "HyprCloud"), @r###"
        <participants>

        </participants>

        <raw_note>

        </raw_note>

        <transcript>

        </transcript>

        Your job is to write a perfect note based on the above informations.
        Note that above given informations like participants, transcript, etc. are already displayed in the UI, so you don't need to repeat them.
        "###);
    }
}
