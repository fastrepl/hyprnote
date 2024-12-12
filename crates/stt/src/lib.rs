use cap_media::feeds::AudioInputSamplesReceiver;

use candle_core::Device;
use candle_nn::{ops::softmax, VarBuilder};
use candle_transformers::models::whisper::{audio, model::Whisper, Config, DTYPE};

pub struct STTState {
    model: Whisper,
    audio_receiver: AudioInputSamplesReceiver,
}

// https://github.com/huggingface/candle/blob/main/candle-examples/examples/whisper/main.rs
// https://github.com/huggingface/candle/blob/main/candle-examples/examples/whisper-microphone/main.rs
impl STTState {
    pub async fn new(audio_rx: AudioInputSamplesReceiver) -> anyhow::Result<Self> {
        // Initialize Whisper model
        let device = Device::new_metal(0)?;

        let config_filename = "whisper-tiny.en.bin";
        let tokenizer_filename = "whisper-tiny.en.tokenizer.json";
        let weights_filename = "whisper-tiny.en.bin";

        let config: Config = serde_json::from_str(&std::fs::read_to_string(config_filename)?)?;

        let vb =
            unsafe { VarBuilder::from_mmaped_safetensors(&[weights_filename], DTYPE, &device)? };
        let model = Whisper::load(&vb, config)?;

        let tokenizer =
            tokenizers::Tokenizer::from_file(tokenizer_filename).map_err(anyhow::Error::msg)?;

        Ok(Self {
            model,
            audio_receiver: audio_rx,
        })
    }

    pub async fn process_audio(&self) -> anyhow::Result<()> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio;

    #[tokio::test]
    async fn test_start_stt() {
        assert!(true);
    }
}
