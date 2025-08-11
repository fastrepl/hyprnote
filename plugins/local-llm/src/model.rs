pub static SUPPORTED_MODELS: &[SupportedModel] = &[
    SupportedModel::Llama3p2_3bQ4,
    SupportedModel::HyprLLM,
    SupportedModel::Gemma3_4bQ4,
];

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub struct ModelInfo {
    pub key: SupportedModel,
    pub name: String,
    pub description: String,
    pub size_bytes: u64,
}

#[derive(Debug, Eq, Hash, PartialEq, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum SupportedModel {
    Llama3p2_3bQ4,
    HyprLLM,
    Gemma3_4bQ4,
}

impl SupportedModel {
    pub fn file_name(&self) -> &str {
        match self {
            SupportedModel::Llama3p2_3bQ4 => "llm.gguf",
            SupportedModel::HyprLLM => "hypr-llm.gguf",
            SupportedModel::Gemma3_4bQ4 => "gemma-3-4b-it-Q4_K_M.gguf",
        }
    }

    pub fn model_url(&self) -> &str {
        match self {
            SupportedModel::Llama3p2_3bQ4 => "https://storage2.hyprnote.com/v0/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf",
            SupportedModel::HyprLLM => "https://storage2.hyprnote.com/v0/yujonglee/hypr-llm-sm/model_q4_k_m.gguf",
            SupportedModel::Gemma3_4bQ4 => "https://storage2.hyprnote.com/v0/unsloth/gemma-3-4b-it-GGUF/gemma-3-4b-it-Q4_K_M.gguf",
        }
    }

    pub fn model_size(&self) -> u64 {
        match self {
            SupportedModel::Llama3p2_3bQ4 => 2019377440,
            SupportedModel::HyprLLM => 1107409056,
            SupportedModel::Gemma3_4bQ4 => 2489894016,
        }
    }

    pub fn model_checksum(&self) -> u64 {
        match self {
            SupportedModel::Llama3p2_3bQ4 => 2831308098,
            SupportedModel::HyprLLM => 4037351144,
            SupportedModel::Gemma3_4bQ4 => 2760830291,
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
