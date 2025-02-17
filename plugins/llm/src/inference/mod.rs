mod template;

use candle_core::quantized::gguf_file;
use candle_core::utils::metal_is_available;
use candle_core::{Device, Tensor};
use candle_examples::token_output_stream::TokenOutputStream;
use candle_transformers::generation::{LogitsProcessor, Sampling};
use candle_transformers::models::quantized_llama::ModelWeights;
use tokenizers::Tokenizer;

use async_openai::types::CreateChatCompletionRequest;

pub struct Model {
    name: SupportedModel,
    device: Device,
    model: ModelWeights,
    tokenizer: Tokenizer,
}

struct Config {
    pub model_repo: String,
    pub model_filename: String,
    pub tokenizer_repo: String,
    pub tokenizer_filename: String,
}

pub enum SupportedModel {
    // https://huggingface.co/NousResearch/Hermes-3-Llama-3.2-3B
    Llama32_3b,
}

impl Into<Config> for SupportedModel {
    fn into(self) -> Config {
        match self {
            SupportedModel::Llama32_3b => Config {
                model_repo: "NousResearch/Hermes-3-Llama-3.2-3B-GGUF".to_string(),
                model_filename: "Hermes-3-Llama-3.2-3B.Q4_K_M.gguf".to_string(),
                tokenizer_repo: "NousResearch/Hermes-3-Llama-3.2-3B".to_string(),
                tokenizer_filename: "tokenizer.json".to_string(),
            },
        }
    }
}

impl Model {
    pub fn new() -> anyhow::Result<Self> {
        let device = if metal_is_available() {
            Device::new_metal(0)
        } else {
            Ok(Device::Cpu)
        }?;

        let config: Config = SupportedModel::Llama32_3b.into();

        let api = hf_hub::api::sync::Api::new()?;

        let tokenizer_path = api
            .model(config.tokenizer_repo.clone())
            .get(&config.tokenizer_filename)?;

        let model_path = api
            .model(config.model_repo.clone())
            .get(&config.model_filename)?;

        let mut file = std::fs::File::open(&model_path)?;
        let model = gguf_file::Content::read(&mut file).map_err(|e| e.with_path(&model_path))?;
        let model = ModelWeights::from_gguf(model, &mut file, &device)?;

        let tokenizer = Tokenizer::from_file(tokenizer_path).unwrap();

        Ok(Self {
            name: SupportedModel::Llama32_3b,
            device,
            model,
            tokenizer,
        })
    }

    // https://github.com/huggingface/candle/blob/fd7f724/candle-examples/examples/quantized/main.rs
    pub fn generate<'a>(
        &'a mut self,
        request: CreateChatCompletionRequest,
    ) -> impl futures_core::Stream<Item = anyhow::Result<String>> + 'a {
        async_stream::try_stream! {
            let eos_token = self.name.eos_token();
            let eos_token_id = self.tokenizer.token_to_id(&eos_token).unwrap();
            let mut tos = TokenOutputStream::new(self.tokenizer.clone());

            let prompt = self.name.apply_chat_template(&request);
            let tokens = tos.tokenizer().encode(prompt, true).unwrap();
            let prompt_tokens = tokens.get_ids().to_vec();

            let seed = 299792458;
            let mut logits_processor = LogitsProcessor::from_sampling(seed, Sampling::ArgMax);

            let mut input = Tensor::new(prompt_tokens.as_slice(), &self.device)?.unsqueeze(0)?;

            for index in 0..request.max_completion_tokens.unwrap_or(500) {
                let logits = self.model.forward(&input, prompt_tokens.len() + index as usize)?;
                let logits = logits.squeeze(0)?;
                let next_token = logits_processor.sample(&logits)?;

                if let Some(t) = tos.next_token(next_token)? {
                    yield t.to_string();
                }

                if next_token == eos_token_id {
                    break;
                }

                input = Tensor::new(&[next_token], &self.device)?.unsqueeze(0)?;
            }

            if let Some(rest) = tos.decode_rest().map_err(candle_core::Error::msg)? {
                yield rest.to_string();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Model;
    use async_openai::types::{ChatCompletionRequestUserMessageArgs, CreateChatCompletionRequest};
    use futures_util::{pin_mut, StreamExt};

    #[tokio::test]
    async fn test_generate() {
        let mut model = Model::new().unwrap();

        let stream = model.generate(CreateChatCompletionRequest {
            messages: vec![ChatCompletionRequestUserMessageArgs::default()
                .content("What is the capital of South Korea?")
                .build()
                .unwrap()
                .into()],
            ..Default::default()
        });

        pin_mut!(stream);
        let res = stream
            .map(|r| r.unwrap_or_default())
            .collect::<String>()
            .await;
        assert!(res.contains("Seoul"));
    }
}
