use include_url_macro::include_url;
use std::sync::{Arc, OnceLock};

use llama_cpp_2::{
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::{params::LlamaModelParams, AddBos, LlamaChatTemplate, LlamaModel, Special},
    sampling::LlamaSampler,
    send_logs_to_tracing, LogOptions,
};

mod error;
pub use error::*;

mod message;
pub use message::*;

const DEFAULT_MAX_INPUT_TOKENS: u32 = 1024 * 8;
const DEFAULT_MAX_OUTPUT_TOKENS: u32 = 1024 * 2;

static LLAMA_BACKEND: OnceLock<Arc<LlamaBackend>> = OnceLock::new();

#[allow(dead_code)]
const JSON_ARR_GRAMMAR: &str = include_url!(
    "https://raw.githubusercontent.com/ggml-org/llama.cpp/7a84777/grammars/json_arr.gbnf"
);

#[allow(dead_code)]
const JSON_GRAMMAR: &str =
    include_url!("https://raw.githubusercontent.com/ggml-org/llama.cpp/7a84777/grammars/json.gbnf");

pub struct Llama {
    task_sender: tokio::sync::mpsc::UnboundedSender<Task>,
}

pub enum Task {
    Generate {
        request: LlamaRequest,
        response_sender: tokio::sync::mpsc::UnboundedSender<String>,
    },
}

impl Llama {
    pub fn new(model_path: impl Into<std::path::PathBuf>) -> Result<Self, crate::Error> {
        if !cfg!(debug_assertions) {
            send_logs_to_tracing(LogOptions::default().with_logs_enabled(true));
        }

        let backend = LLAMA_BACKEND
            .get_or_init(|| {
                let backend = LlamaBackend::init().unwrap();
                Arc::new(backend)
            })
            .clone();

        let params = LlamaModelParams::default();
        let model = LlamaModel::load_from_file(&backend, model_path.into(), &params)?;
        let tpl = LlamaChatTemplate::new("llama3").unwrap();

        let (task_sender, mut task_receiver) = tokio::sync::mpsc::unbounded_channel::<Task>();

        std::thread::spawn({
            move || {
                while let Some(task) = task_receiver.blocking_recv() {
                    match task {
                        Task::Generate {
                            request,
                            response_sender,
                        } => {
                            let prompt = model
                                .apply_chat_template(&tpl, &request.messages, true)
                                .unwrap();

                            let mut ctx = model
                                .new_context(
                                    &backend,
                                    // https://github.com/ggml-org/llama.cpp/blob/492d7f1/src/llama-context.cpp#L2261
                                    LlamaContextParams::default()
                                        .with_n_ctx(std::num::NonZeroU32::new(
                                            DEFAULT_MAX_INPUT_TOKENS + DEFAULT_MAX_OUTPUT_TOKENS,
                                        ))
                                        .with_n_batch(DEFAULT_MAX_INPUT_TOKENS)
                                        .with_n_ubatch(256)
                                        .with_flash_attention(true),
                                )
                                .unwrap();

                            let mut tokens_list =
                                model.str_to_token(&prompt, AddBos::Always).unwrap();
                            tokens_list.truncate(DEFAULT_MAX_INPUT_TOKENS as usize);

                            let batch_size = tokens_list.len().max(256);
                            let mut batch = LlamaBatch::new(batch_size, 1);

                            let last_index = (tokens_list.len() - 1) as i32;
                            for (i, token) in (0_i32..).zip(tokens_list.into_iter()) {
                                let is_last = i == last_index;
                                batch.add(token, i, &[0], is_last).unwrap();
                            }

                            ctx.decode(&mut batch).unwrap();

                            let mut n_cur = batch.n_tokens();
                            let mut decoder = encoding_rs::UTF_8.new_decoder();
                            let mut sampler = LlamaSampler::chain_simple([
                                LlamaSampler::dist(1234),
                                LlamaSampler::greedy(),
                            ]);

                            while n_cur <= last_index + DEFAULT_MAX_OUTPUT_TOKENS as i32 {
                                let token = sampler.sample(&ctx, batch.n_tokens() - 1);
                                sampler.accept(token);

                                if model.is_eog_token(token) {
                                    break;
                                }

                                let output_bytes =
                                    model.token_to_bytes(token, Special::Tokenize).unwrap();
                                let mut output_string = String::with_capacity(32);
                                let _decode_result = decoder.decode_to_string(
                                    &output_bytes,
                                    &mut output_string,
                                    false,
                                );

                                if response_sender.send(output_string).is_err() {
                                    break;
                                }

                                batch.clear();
                                batch.add(token, n_cur, &[0], true).unwrap();

                                n_cur += 1;
                                ctx.decode(&mut batch).unwrap();
                            }
                        }
                    }
                }
            }
        });

        Ok(Self { task_sender })
    }

    pub fn generate_stream(
        &self,
        request: LlamaRequest,
    ) -> Result<impl futures_util::Stream<Item = String>, crate::Error> {
        let (response_sender, response_receiver) = tokio::sync::mpsc::unbounded_channel::<String>();

        let task = Task::Generate {
            request,
            response_sender,
        };

        self.task_sender.send(task)?;

        let stream = futures_util::stream::unfold(response_receiver, |mut rx| async move {
            rx.recv().await.map(|token| (token, rx))
        });

        Ok(stream)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;
    use llama_cpp_2::model::LlamaChatMessage;

    fn get_model() -> Llama {
        let model_path = dirs::data_dir()
            .unwrap()
            .join("com.hyprnote.dev")
            .join("llm.gguf");
        Llama::new(model_path).unwrap()
    }

    // cargo test test_simple -p llama -- --nocapture
    #[tokio::test]
    async fn test_simple() {
        let llama = get_model();
        let prompt = "Hello, how are you?";

        let request = LlamaRequest::new(vec![
            LlamaChatMessage::new("user".into(), prompt.into()).unwrap()
        ]);

        let response: String = llama.generate_stream(request).unwrap().collect().await;
        println!("response: {}", response);
        assert!(response.len() > 4);
    }

    // cargo test test_long -p llama -- --nocapture
    #[tokio::test]
    async fn test_long() {
        let llama = get_model();

        let prompt = std::iter::repeat("Hello, how are you?")
            .take(800)
            .collect::<Vec<_>>()
            .join("\n");

        let request = LlamaRequest::new(vec![
            LlamaChatMessage::new("user".into(), prompt.into()).unwrap()
        ]);

        let response: String = llama.generate_stream(request).unwrap().collect().await;
        println!("response: {}", response);
        assert!(response.len() > 4);
    }
}
