use candle_core::quantized::gguf_file;
use candle_core::utils::metal_is_available;
use candle_core::{Device, Tensor};
use candle_examples::token_output_stream::TokenOutputStream;
use candle_transformers::generation::{LogitsProcessor, Sampling};
use candle_transformers::models::quantized_llama::ModelWeights;
use tokenizers::Tokenizer;

pub struct Model {
    device: Device,
    model: ModelWeights,
    tokenizer: Tokenizer,
}

impl Model {
    pub fn new() -> anyhow::Result<Self> {
        candle_core::cuda::set_gemm_reduced_precision_f16(true);
        candle_core::cuda::set_gemm_reduced_precision_bf16(true);

        let device = if metal_is_available() {
            Device::new_metal(0)
        } else {
            Ok(Device::Cpu)
        }?;

        let (model_repo, model_filename) = (
            "NousResearch/Hermes-3-Llama-3.2-3B-GGUF",
            "Hermes-3-Llama-3.2-3B.Q4_K_M.gguf",
        );

        let (tokenizer_repo, tokenizer_filename) =
            ("NousResearch/Hermes-3-Llama-3.2-3B", "tokenizer.json");

        let api = hf_hub::api::sync::Api::new()?;

        let tokenizer_path = api
            .model(tokenizer_repo.to_string())
            .get(tokenizer_filename)?;

        let model_path = api.model(model_repo.to_string()).get(model_filename)?;

        let mut file = std::fs::File::open(&model_path)?;
        let model = gguf_file::Content::read(&mut file).map_err(|e| e.with_path(&model_path))?;
        let model = ModelWeights::from_gguf(model, &mut file, &device)?;

        let tokenizer = Tokenizer::from_file(tokenizer_path).unwrap();

        Ok(Self {
            device,
            model,
            tokenizer,
        })
    }

    pub fn generate(&mut self, prompt: &str) -> anyhow::Result<()> {
        let mut tos = TokenOutputStream::new(self.tokenizer.clone());
        let tokens = tos.tokenizer().encode(prompt, true).unwrap();
        let prompt_tokens = tokens.get_ids().to_vec();

        let mut logits_processor = LogitsProcessor::from_sampling(299792458, Sampling::ArgMax);

        let input = Tensor::new(prompt_tokens.as_slice(), &self.device)?.unsqueeze(0)?;
        let logits = self.model.forward(&input, 0)?;
        let logits = logits.squeeze(0)?;
        let mut next_token = logits_processor.sample(&logits)?;

        let mut all_tokens = vec![next_token];
        let sample_len = 100;

        for index in 0..sample_len {
            let input = Tensor::new(&[next_token], &self.device)?.unsqueeze(0)?;
            let logits = self.model.forward(&input, prompt_tokens.len() + index)?;
            let logits = logits.squeeze(0)?;

            next_token = logits_processor.sample(&logits)?;
            all_tokens.push(next_token);

            if let Some(t) = tos.next_token(next_token)? {
                print!("{t}");
            }
        }

        if let Some(rest) = tos.decode_rest().map_err(candle_core::Error::msg)? {
            print!("{rest}");
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate() {
        let mut model = Model::new().unwrap();
        model
            .generate("What is the capital of South Korea?")
            .unwrap();
    }
}
