use std::sync::{Arc, OnceLock};

use llama_cpp_2::{
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::{params::LlamaModelParams, AddBos, LlamaChatTemplate, LlamaModel, Special},
    sampling::LlamaSampler,
    send_logs_to_tracing, LogOptions,
};
use tokio_stream::wrappers::UnboundedReceiverStream;

use hypr_gguf::GgufExt;

mod error;
mod types;

pub use error::*;
pub use types::*;

const DEFAULT_MAX_INPUT_TOKENS: u32 = 1024 * 16;
const DEFAULT_MAX_OUTPUT_TOKENS: u32 = 1024 * 2;

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
    fn get_backend() -> Arc<LlamaBackend> {
        LLAMA_BACKEND
            .get_or_init(|| {
                let backend = LlamaBackend::init().unwrap();
                Arc::new(backend)
            })
            .clone()
    }

    fn load_model(model_path: impl AsRef<std::path::Path>) -> Result<LlamaModel, crate::Error> {
        let backend = Self::get_backend();

        let full_gpu_layers: u32 = std::num::NonZeroU32::MAX.into();
        let cpu_only_layers: u32 = 0;

        let gpu_params = LlamaModelParams::default().with_n_gpu_layers(full_gpu_layers);

        match LlamaModel::load_from_file(&backend, &model_path, &gpu_params) {
            Ok(model) => Ok(model),
            Err(_) => {
                let params = LlamaModelParams::default().with_n_gpu_layers(cpu_only_layers);
                LlamaModel::load_from_file(&backend, model_path, &params).map_err(Into::into)
            }
        }
    }

    fn get_sampler(model: &LlamaModel, grammar: Option<&str>) -> LlamaSampler {
        let items = [
            if let Some(grammar) = grammar {
                Some(LlamaSampler::grammar(&model, grammar, "root"))
            } else {
                None
            },
            Some(LlamaSampler::temp(0.8)),
            Some(LlamaSampler::penalties(0, 1.4, 0.1, 0.0)),
            Some(LlamaSampler::mirostat_v2(1234, 3.0, 0.2)),
        ];

        LlamaSampler::chain_simple(items.into_iter().flatten().collect::<Vec<_>>())
    }

    pub fn new(model_path: impl AsRef<std::path::Path>) -> Result<Self, crate::Error> {
        let show_logs = if cfg!(debug_assertions) { true } else { false };
        send_logs_to_tracing(LogOptions::default().with_logs_enabled(show_logs));

        let fmt = model_path.gguf_chat_format()?.unwrap();
        let tpl = LlamaChatTemplate::new(fmt.as_ref()).unwrap();

        let backend = Self::get_backend();
        let model = Self::load_model(model_path)?;

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

                            let mut tokens_list =
                                model.str_to_token(&prompt, AddBos::Always).unwrap();
                            tokens_list.truncate(DEFAULT_MAX_INPUT_TOKENS as usize);
                            let input_tokens_len = tokens_list.len() as u32;

                            let mut ctx = model
                                .new_context(
                                    &backend,
                                    // https://github.com/ggml-org/llama.cpp/blob/492d7f1/src/llama-context.cpp#L2261
                                    LlamaContextParams::default()
                                        .with_n_ctx(std::num::NonZeroU32::new(
                                            input_tokens_len + DEFAULT_MAX_OUTPUT_TOKENS,
                                        )) // NoKvCacheSlot
                                        .with_n_batch(input_tokens_len) // GGML_ASSERT(n_tokens_all <= cparams.n_batch)
                                        .with_embeddings(false)
                                        .with_flash_attention(true),
                                )
                                .unwrap();

                            let batch_size = tokens_list.len().max(512);
                            let mut batch = LlamaBatch::new(batch_size, 1);

                            let last_index = (tokens_list.len() - 1) as i32;
                            for (i, token) in (0_i32..).zip(tokens_list.into_iter()) {
                                let is_last = i == last_index;
                                batch.add(token, i, &[0], is_last).unwrap();
                            }

                            ctx.decode(&mut batch).unwrap();

                            let mut n_cur = batch.n_tokens();
                            let mut decoder = encoding_rs::UTF_8.new_decoder();
                            let mut sampler = Self::get_sampler(&model, request.grammar.as_deref());

                            let mut got_first_token = false;
                            let mut acc = String::new();

                            while n_cur <= last_index + DEFAULT_MAX_OUTPUT_TOKENS as i32 {
                                let token = sampler.sample(&ctx, batch.n_tokens() - 1);

                                if !got_first_token {
                                    got_first_token = true;
                                    tracing::info!("llm_got_first_token");
                                }

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

                                acc += &output_string;
                                if response_sender.send(output_string).is_err() {
                                    break;
                                }

                                batch.clear();
                                batch.add(token, n_cur, &[0], true).unwrap();

                                n_cur += 1;
                                ctx.decode(&mut batch).unwrap();
                            }

                            drop(response_sender);
                            tracing::info!("llm_acc: {}", acc);
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
        tracing::info!("llm_task_sent");

        let stream = UnboundedReceiverStream::new(response_receiver);

        Ok(stream)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    async fn run(model: &Llama, request: LlamaRequest, print_stream: bool) -> String {
        use futures_util::pin_mut;
        use std::io::{self, Write};

        let stream = model.generate_stream(request).unwrap();
        pin_mut!(stream);

        let mut acc = String::new();

        while let Some(token) = stream.next().await {
            acc += &token;
            if print_stream {
                print!("{}", token);
                io::stdout().flush().unwrap();
            }
        }

        if print_stream {
            println!();
        }

        acc
    }

    fn get_model() -> Llama {
        let model_path = dirs::data_dir()
            .unwrap()
            .join("com.hyprnote.dev")
            .join("llm.gguf");

        Llama::new(model_path).unwrap()
    }

    #[test]
    fn test_tag() {
        assert!(hypr_template::ENHANCE_USER_TPL.contains("<headers>"));
    }

    // cargo test test_english_1 -p llama -- --nocapture --ignored
    #[ignore]
    #[tokio::test]
    async fn test_english_1() {
        let llama = get_model();

        let request = LlamaRequest {
            grammar: Some(hypr_gbnf::GBNF::Enhance.build()),
            messages: vec![
                LlamaChatMessage::new(
                    "system".into(),
                    "Summarize the text the user gives you.".into(),
                )
                .unwrap(),
                LlamaChatMessage::new("user".into(), hypr_data::english_4::WORDS_JSON.repeat(1))
                    .unwrap(),
            ],
        };

        run(&llama, request, true).await;
    }
}
