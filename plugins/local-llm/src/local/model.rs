pub static SUPPORTED_MODELS: &[SupportedModel; 1] = &[SupportedModel::Llama3p2_3bQ4];

#[derive(serde::Serialize, serde::Deserialize, specta::Type, Clone)]
pub enum SupportedModel {
    Llama3p2_3bQ4,
}

impl SupportedModel {
    pub fn file_name(&self) -> &str {
        match self {
            SupportedModel::Llama3p2_3bQ4 => "llm.gguf",
        }
    }

    pub fn model_url(&self) -> &str {
        match self {
            SupportedModel::Llama3p2_3bQ4 => "https://storage.hyprnote.com/v0/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"
        }
    }

    pub fn model_size(&self) -> u64 {
        match self {
            SupportedModel::Llama3p2_3bQ4 => 2019377440,
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub enum ModelIdentifier {
    #[serde(rename = "local")]
    Local,
    #[serde(rename = "mock-onboarding")]
    MockOnboarding,
}
