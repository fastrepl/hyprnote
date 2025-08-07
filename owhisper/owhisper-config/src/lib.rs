mod error;
pub use error::*;

#[macro_export]
macro_rules! common_derives {
    ($item:item) => {
        #[derive(Debug, Clone, serde::Deserialize, serde::Serialize, schemars::JsonSchema)]
        $item
    };
}

common_derives! {
    #[derive(Default)]
    pub struct Config {
        pub general: Option<GeneralConfig>,
        pub models: Vec<ModelConfig>,
    }
}

common_derives! {
    #[serde(tag = "type")]
    pub enum ModelConfig {
        #[serde(rename = "aws")]
        Aws(AwsModelConfig),
        #[serde(rename = "deepgram")]
        Deepgram(DeepgramModelConfig),
        #[serde(rename = "whisper-cpp")]
        WhisperCpp(WhisperCppModelConfig),
    }
}

impl Config {
    pub fn new(path: Option<String>) -> Result<Self, crate::Error> {
        let settings = config::Config::builder()
            .add_source(config::File::with_name(&path.unwrap_or_else(|| {
                Config::base().join("config").to_str().unwrap().to_string()
            })))
            .add_source(config::Environment::with_prefix("OWHISPER"))
            .build()?;

        let config = settings.try_deserialize::<Config>()?;
        Ok(config)
    }

    pub fn global_config_path() -> std::path::PathBuf {
        Config::base().join("config.json")
    }

    pub fn base() -> std::path::PathBuf {
        dirs::home_dir().unwrap().join(".owhisper")
    }
}

common_derives! {
    #[derive(Default)]
    pub struct GeneralConfig {
        pub api_key: Option<String>,
    }
}

common_derives! {
    pub struct AwsModelConfig {
        pub id: String,
        pub region: String,
        pub access_key_id: String,
        pub secret_access_key: String,
    }
}

common_derives! {
    #[derive(Default)]
    pub struct DeepgramModelConfig {
        pub id: String,
        pub api_key: Option<String>,
        pub base_url: Option<String>,
    }
}

common_derives! {
    pub struct WhisperCppModelConfig {
        pub id: String,
        pub model_path: String,
    }
}
