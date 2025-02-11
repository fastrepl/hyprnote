pub fn default_config_with_language(
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

pub async fn run_input(
    group_label: impl std::fmt::Display,
    test_label: impl std::fmt::Display,
    input: impl crate::OpenAIRequest,
) {
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

    let req = input.as_openai_request().unwrap();
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
    let path = format!("./out/{}/{}/{}.html", group_label, test_label, now);

    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).unwrap();
    }
    std::fs::write(&path, html).unwrap();
}

pub fn print_prompt(prompt: impl Into<String>) {
    let prompt = prompt.into();

    bat::PrettyPrinter::new()
        .grid(true)
        .language("markdown")
        .input_from_bytes(prompt.as_bytes())
        .print()
        .unwrap();
}

#[macro_export]
macro_rules! generate_tests {
    ( $( $test_name:ident => $input_expr:expr ),+ $(,)? ) => {
        $(
            #[tokio::test]
            async fn $test_name() {
                crate::test_utils::run_input(
                    module_path!().split("::").nth(1).unwrap(),
                    stringify!($test_name),
                    $input_expr
                ).await;
            }
        )+
    }
}
