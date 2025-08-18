#[derive(Debug, Clone)]
pub enum Assets {
    Config,
    Model,
    Tokenizer,
    Mimi,
}

impl Assets {
    pub fn filename(&self) -> &'static str {
        match self {
            Assets::Config => "config.json",
            Assets::Model => "model.safetensors",
            Assets::Tokenizer => "tokenizer.model",
            Assets::Mimi => "mimi.safetensors",
        }
    }

    pub fn url(&self, base_url: &str) -> String {
        format!("{}/{}", base_url, self.filename())
    }
}
