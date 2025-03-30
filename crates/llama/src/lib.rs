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

const DEFAULT_MAX_TOKENS: i32 = 1024;

static LLAMA_BACKEND: OnceLock<Arc<LlamaBackend>> = OnceLock::new();

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
        send_logs_to_tracing(LogOptions::default().with_logs_enabled(true));

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
                                    LlamaContextParams::default()
                                        .with_n_ctx(std::num::NonZeroU32::new(4096 * 2))
                                        .with_n_batch(4096),
                                )
                                .unwrap();

                            let tokens_list = model.str_to_token(&prompt, AddBos::Always).unwrap();

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

                            while n_cur <= last_index + DEFAULT_MAX_TOKENS {
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

    struct Tokenizer {
        tokenizer: tokenizers::Tokenizer,
    }

    impl Tokenizer {
        async fn new() -> Self {
            let url = "https://pub-8987485129c64debb63bff7f35a2e5fd.r2.dev/v0/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/main/tokenizer.json";
            let bytes = reqwest::get(url).await.unwrap().bytes().await.unwrap();
            let tokenizer = tokenizers::Tokenizer::from_bytes(&bytes).unwrap();
            Self { tokenizer }
        }

        fn count_tokens(&self, text: &str) -> usize {
            self.tokenizer.encode(text, true).unwrap().len()
        }
    }

    static TOKENIZER: tokio::sync::OnceCell<Arc<Tokenizer>> = tokio::sync::OnceCell::const_new();

    async fn get_tokenizer() -> Arc<Tokenizer> {
        TOKENIZER
            .get_or_init(|| async {
                let tokenizer = Tokenizer::new().await;
                Arc::new(tokenizer)
            })
            .await
            .clone()
    }

    #[tokio::test]
    async fn test_simple() {
        let llama = get_model();
        let tokenizer = get_tokenizer().await;

        let prompt = "Hello, how are you?";

        let tokens_count = tokenizer.count_tokens(prompt);
        assert_eq!(tokens_count, 7);

        let request = LlamaRequest::new(vec![
            LlamaChatMessage::new("user".into(), prompt.into()).unwrap()
        ]);

        let response: String = llama.generate_stream(request).unwrap().collect().await;
        assert!(response.len() > 4);
    }

    #[tokio::test]
    async fn test_long() {
        let llama = get_model();
        let tokenizer = get_tokenizer().await;

        let prompt = std::iter::repeat("Hello, how are you?")
            .take(400)
            .collect::<Vec<_>>()
            .join("\n");

        let tokens_count = tokenizer.count_tokens(&prompt);
        assert_eq!(tokens_count, 2401);

        let request = LlamaRequest::new(vec![
            LlamaChatMessage::new("user".into(), prompt.into()).unwrap()
        ]);

        let response: String = llama.generate_stream(request).unwrap().collect().await;
        assert!(response.len() > 4);
    }
}
