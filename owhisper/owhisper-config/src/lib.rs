#[derive(serde::Deserialize, schemars::JsonSchema, Default)]
pub struct Config {
    pub general: Option<GeneralConfig>,
    pub serve: Option<ServeConfig>,
}

impl Config {
    pub fn new(config_path: &str) -> Self {
        let settings = config::Config::builder()
            .add_source(config::File::with_name(config_path))
            .add_source(config::Environment::with_prefix("OWHISPER"))
            .build()
            .unwrap();

        settings.try_deserialize::<Config>().unwrap()
    }
}

#[derive(serde::Deserialize, schemars::JsonSchema, Default)]
pub struct GeneralConfig {
    pub api_key: Option<String>,
}

#[derive(serde::Deserialize, schemars::JsonSchema, Default)]
pub struct ServeConfig {
    pub aws: Option<ServeAwsConfig>,
    pub azure: Option<ServeAzureConfig>,
    pub whisper_cpp: Option<ServeWhisperCppConfig>,
}

#[derive(serde::Deserialize, schemars::JsonSchema)]
pub struct ServeAwsConfig {
    pub region: String,
    pub access_key_id: String,
    pub secret_access_key: String,
}

#[derive(serde::Deserialize, schemars::JsonSchema)]
pub struct ServeAzureConfig {
    pub region: String,
    pub access_key_id: String,
    pub secret_access_key: String,
}

#[derive(serde::Deserialize, schemars::JsonSchema)]
pub struct ServeDeepgramConfig {
    pub api_key: String,
    pub base_url: Option<String>,
}

#[derive(serde::Deserialize, schemars::JsonSchema)]
pub struct ServeWhisperCppConfig {
    pub model_path: String,
}
