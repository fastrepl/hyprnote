use std::path::PathBuf;

use candle_core::Device;
use candle_nn::VarBuilder;
use candle_transformers::models::whisper::{model::Whisper, Config, DTYPE};

pub struct STTState {
    model: Whisper,
}

pub struct STTConfig {
    whisper_config_path: PathBuf,
    whisper_tokenizer_path: PathBuf,
    whisper_weights_path: PathBuf,
}

mod whisper;

// https://github.com/huggingface/candle/blob/main/candle-examples/examples/whisper/main.rs
// https://github.com/huggingface/candle/blob/main/candle-examples/examples/whisper-microphone/main.rs
impl STTState {
    pub async fn new(stt_config: STTConfig) -> anyhow::Result<Self> {
        let device = Device::new_metal(0)?;

        let config: Config =
            serde_json::from_str(&std::fs::read_to_string(stt_config.whisper_config_path)?)?;

        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[stt_config.whisper_weights_path], DTYPE, &device)?
        };
        let model = Whisper::load(&vb, config)?;

        let _ = tokenizers::Tokenizer::from_file(stt_config.whisper_tokenizer_path)
            .map_err(anyhow::Error::msg)?;

        Ok(Self { model })
    }
}

#[cfg(test)]
mod tests {
    use tokio;

    #[tokio::test]
    async fn test_start_stt() {
        assert!(true);
    }
}
