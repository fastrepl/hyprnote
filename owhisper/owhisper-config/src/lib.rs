#[derive(serde::Deserialize, schemars::JsonSchema, Default)]
pub struct Config {
    pub general: Option<GeneralConfig>,
    pub models: Vec<ModelConfig>,
}

#[derive(serde::Deserialize, schemars::JsonSchema)]
#[serde(tag = "type")]
pub enum ModelConfig {
    #[serde(rename = "aws")]
    Aws(AwsModelConfig),
    #[serde(rename = "deepgram")]
    Deepgram(DeepgramModelConfig),
    #[serde(rename = "whisper-cpp")]
    WhisperCpp(WhisperCppModelConfig),
}

impl Config {
    pub fn new(config_path: Option<&str>) -> Self {
        let default = dirs::config_dir()
            .unwrap()
            .join(".owhisper")
            .join("config.json");

        let settings = config::Config::builder()
            .add_source(config::File::with_name(
                config_path.unwrap_or(default.to_str().unwrap()),
            ))
            .add_source(config::Environment::with_prefix("OWHISPER"))
            .build()
            .unwrap();

        settings.try_deserialize::<Config>().unwrap()
    }
}

#[derive(serde::Deserialize, schemars::JsonSchema, Default, Clone)]
pub struct GeneralConfig {
    pub api_key: Option<String>,
}

#[derive(serde::Deserialize, schemars::JsonSchema, Default, Clone)]
pub struct AwsModelConfig {
    pub id: String,
    pub region: String,
    pub access_key_id: String,
    pub secret_access_key: String,
}

#[derive(serde::Deserialize, schemars::JsonSchema, Default, Clone)]
pub struct DeepgramModelConfig {
    pub id: String,
    pub api_key: Option<String>,
    pub base_url: String,
}

#[derive(serde::Deserialize, schemars::JsonSchema, Default, Clone)]
pub struct WhisperCppModelConfig {
    pub id: String,
    pub model_path: String,
}
