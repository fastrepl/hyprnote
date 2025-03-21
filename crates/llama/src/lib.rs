use llama_cpp_2::{
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::{
        params::LlamaModelParams,
        {AddBos, LlamaModel, Special},
    },
    sampling::LlamaSampler,
    send_logs_to_tracing, LogOptions,
};

mod error;
pub use error::*;

const DEFAULT_MAX_TOKENS: usize = 1024;
const CONTEXT_SIZE: u32 = 2048;
const SAMPLER_SEED: u32 = 82;

pub struct Llama {
    backend: LlamaBackend,
    model: LlamaModel,
    max_tokens: usize,
}

impl Llama {
    pub fn new(model_path: impl Into<std::path::PathBuf>) -> Result<Self, crate::Error> {
        send_logs_to_tracing(LogOptions::default().with_logs_enabled(true));

        let backend = LlamaBackend::init()?;
        let params = LlamaModelParams::default();
        let model = LlamaModel::load_from_file(&backend, model_path.into(), &params)?;

        Ok(Self {
            backend,
            model,
            max_tokens: DEFAULT_MAX_TOKENS,
        })
    }

    pub fn generate(&self, prompt: impl AsRef<str>) -> Result<String, crate::Error> {
        let mut ctx = self.model.new_context(
            &self.backend,
            LlamaContextParams::default().with_n_ctx(std::num::NonZeroU32::new(CONTEXT_SIZE)),
        )?;

        let tokens_list = self.model.str_to_token(prompt.as_ref(), AddBos::Always)?;
        let mut batch = LlamaBatch::new(512, 1);

        let last_index = (tokens_list.len() - 1) as i32;
        for (i, token) in (0_i32..).zip(tokens_list.into_iter()) {
            let is_last = i == last_index;
            batch.add(token, i, &[0], is_last)?;
        }

        ctx.decode(&mut batch)?;

        let mut n_cur = batch.n_tokens();
        let mut decoder = encoding_rs::UTF_8.new_decoder();
        let mut sampler =
            LlamaSampler::chain_simple([LlamaSampler::dist(SAMPLER_SEED), LlamaSampler::greedy()]);

        let mut result = String::new();
        result.push_str(prompt.as_ref().as_ref());

        while n_cur <= last_index as i32 + self.max_tokens as i32 {
            let token = sampler.sample(&ctx, batch.n_tokens() - 1);
            sampler.accept(token);

            if self.model.is_eog_token(token) {
                break;
            }

            let output_bytes = self.model.token_to_bytes(token, Special::Tokenize)?;
            let mut output_string = String::with_capacity(32);
            let _decode_result = decoder.decode_to_string(&output_bytes, &mut output_string, false);
            result.push_str(&output_string);

            batch.clear();
            batch.add(token, n_cur, &[0], true)?;

            n_cur += 1;
            ctx.decode(&mut batch)?;
        }

        Ok(result)
    }
}
