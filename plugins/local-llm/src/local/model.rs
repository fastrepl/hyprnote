pub static SUPPORTED_MODELS: &[SupportedModel; 1] = &[SupportedModel::Llama3p2_3bQ4];

#[derive(serde::Serialize, serde::Deserialize, specta::Type, Clone)]
pub enum SupportedModel {
    Llama3p2_3bQ4,
    HyprLLM,
}

impl SupportedModel {
    pub fn file_name(&self) -> &str {
        match self {
            SupportedModel::Llama3p2_3bQ4 => "llm.gguf",
            SupportedModel::HyprLLM => "hypr-llm.gguf",
        }
    }

    pub fn model_url(&self) -> &str {
        match self {
            SupportedModel::Llama3p2_3bQ4 => "https://storage.hyprnote.com/v0/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf",
            SupportedModel::HyprLLM => "https://storage.hyprnote.com/v0/yujonglee/hypr-llm-sm/model_q4_k_m.gguf"
        }
    }

    pub fn model_size(&self) -> u64 {
        match self {
            SupportedModel::Llama3p2_3bQ4 => 2019377440,
            SupportedModel::HyprLLM => 1107409056,
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
