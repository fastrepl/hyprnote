use tokenizers::Tokenizer;
use tokio::sync::Mutex;

use candle_core::{quantized::gguf_file, Device, Tensor};
use candle_examples::token_output_stream::TokenOutputStream;
use candle_transformers::{
    generation::{LogitsProcessor, Sampling},
    models::quantized_qwen2::ModelWeights as Qwen2,
};

pub struct LLM {
    device: Device,
    model: Mutex<Qwen2>,
    tokenizer: Tokenizer,
}

impl LLM {
    pub async fn new(tokenizer_path: &str, model_path: &str) -> anyhow::Result<Self> {
        let device = Device::new_metal(0)?;
        let tokenizer = Tokenizer::from_file(tokenizer_path).map_err(anyhow::Error::msg)?;

        let mut file = std::fs::File::open(&model_path)?;
        let model = gguf_file::Content::read(&mut file).map_err(|e| e.with_path(model_path))?;
        let model = Qwen2::from_gguf(model, &mut file, &device)?;

        Ok(Self {
            device,
            tokenizer,
            model: Mutex::new(model),
        })
    }

    // https://github.com/huggingface/candle/blob/main/candle-examples/examples/quantized-qwen2-instruct/main.rs
    pub async fn run(&self, prompt: &str) -> anyhow::Result<String> {
        let sample_len: usize = 1200;
        let repeat_penalty = 1.1;
        let repeat_last_n = 64;

        let prompt_str = format!(
            "<|im_start|>user\n{}<|im_end|>\n<|im_start|>assistant\n",
            prompt
        );

        let mut tos = TokenOutputStream::new(self.tokenizer.clone());

        let tokens = tos
            .tokenizer()
            .encode(prompt_str, true)
            .map_err(anyhow::Error::msg)?;
        let tokens = tokens.get_ids();

        let mut all_tokens = vec![];
        let mut logits_processor = self.create_logits_processor();

        let input = Tensor::new(tokens, &self.device)?.unsqueeze(0)?;
        let logits = self.model.lock().await.forward(&input, 0)?;
        let logits = logits.squeeze(0)?;
        let mut next_token = logits_processor.sample(&logits)?;

        all_tokens.push(next_token);
        let mut generated_text = String::new();
        if let Some(t) = tos.next_token(next_token)? {
            generated_text.push_str(&t);
        }

        let eos_token = *tos.tokenizer().get_vocab(true).get("<|im_end|>").unwrap();
        let to_sample = sample_len.saturating_sub(1);

        for index in 0..to_sample {
            let input = Tensor::new(&[next_token], &self.device)?.unsqueeze(0)?;
            let logits = self
                .model
                .lock()
                .await
                .forward(&input, tokens.len() + index)?;
            let logits = logits.squeeze(0)?;

            let logits = if repeat_penalty == 1. {
                logits
            } else {
                let start_at = all_tokens.len().saturating_sub(repeat_last_n);
                candle_transformers::utils::apply_repeat_penalty(
                    &logits,
                    repeat_penalty,
                    &all_tokens[start_at..],
                )?
            };

            next_token = logits_processor.sample(&logits)?;
            all_tokens.push(next_token);

            if let Some(t) = tos.next_token(next_token)? {
                generated_text.push_str(&t);
            }

            if next_token == eos_token {
                break;
            }
        }

        if let Some(rest) = tos.decode_rest().map_err(candle_core::Error::msg)? {
            generated_text.push_str(&rest);
        }

        Ok(generated_text)
    }

    fn create_logits_processor(&self) -> LogitsProcessor {
        let seed = 299792458;
        let temperature = 0.3;

        let sampling = if temperature <= 0. {
            Sampling::ArgMax
        } else {
            Sampling::All { temperature }
        };

        LogitsProcessor::from_sampling(seed, sampling)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio;

    #[tokio::test]
    async fn test_start_llm() {
        let manifest_dir = env!("CARGO_MANIFEST_DIR");

        let llm = LLM::new(
            &format!("{}/models/tokenizer.json", manifest_dir),
            &format!("{}/models/llm.gguf", manifest_dir),
        )
        .await
        .unwrap();

        let result = llm.run("hello").await.unwrap();
        assert!(result.len() > 1);
    }
}
