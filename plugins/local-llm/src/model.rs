pub static SUPPORTED_MODELS: &[SupportedModel; 1] = &[SupportedModel::Llama3p2_3bQ4];

pub enum SupportedModel {
    Llama3p2_3bQ4,
}

impl SupportedModel {
    pub fn model_path(&self, data_dir: impl Into<std::path::PathBuf>) -> std::path::PathBuf {
        match self {
            SupportedModel::Llama3p2_3bQ4 => data_dir.into().join("llm.gguf"),
        }
    }

    pub fn model_url(&self) -> &str {
        match self {
            SupportedModel::Llama3p2_3bQ4 => "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"
        }
    }

    pub fn model_size(&self) -> u64 {
        match self {
            SupportedModel::Llama3p2_3bQ4 => 2019377440,
        }
    }
}
