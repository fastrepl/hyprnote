use llama_cpp_2::{
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::{
        params::LlamaModelParams, AddBos, LlamaChatMessage, LlamaChatTemplate, LlamaModel, Special,
    },
    sampling::LlamaSampler,
    send_logs_to_tracing, LogOptions,
};

mod error;
pub use error::*;

const DEFAULT_MAX_TOKENS: usize = 1024;
const CONTEXT_SIZE: u32 = 2048;
const SAMPLER_SEED: u32 = 1234;

pub struct Llama {
    task_sender: tokio::sync::mpsc::UnboundedSender<Task>,
}

enum Task {
    Generate {
        request: LlamaRequest,
        response_sender: tokio::sync::mpsc::UnboundedSender<String>,
    },
}

impl Llama {
    pub fn new(model_path: impl Into<std::path::PathBuf>) -> Result<Self, crate::Error> {
        send_logs_to_tracing(LogOptions::default().with_logs_enabled(true));

        let backend = LlamaBackend::init()?;
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
                                        .with_n_ctx(std::num::NonZeroU32::new(CONTEXT_SIZE)),
                                )
                                .unwrap();

                            let tokens_list = model.str_to_token(&prompt, AddBos::Always).unwrap();
                            let mut batch = LlamaBatch::new(512, 1);

                            let last_index = (tokens_list.len() - 1) as i32;
                            for (i, token) in (0_i32..).zip(tokens_list.into_iter()) {
                                let is_last = i == last_index;
                                batch.add(token, i, &[0], is_last).unwrap();
                            }

                            ctx.decode(&mut batch).unwrap();

                            let mut n_cur = batch.n_tokens();
                            let mut decoder = encoding_rs::UTF_8.new_decoder();
                            let mut sampler = LlamaSampler::chain_simple([
                                LlamaSampler::dist(SAMPLER_SEED),
                                LlamaSampler::greedy(),
                            ]);

                            while n_cur <= last_index as i32 + DEFAULT_MAX_TOKENS as i32 {
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

                                if let Err(_) = response_sender.send(output_string) {
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
    ) -> impl futures_util::Stream<Item = String> {
        let (response_sender, response_receiver) = tokio::sync::mpsc::unbounded_channel::<String>();

        let task = Task::Generate {
            request,
            response_sender,
        };

        self.task_sender.send(task).unwrap();

        futures_util::stream::unfold(response_receiver, |mut rx| async move {
            rx.recv().await.map(|token| (token, rx))
        })
    }
}

pub struct LlamaRequest {
    pub messages: [LlamaChatMessage; 2],
}

#[derive(Default)]
pub struct LlamaRequestBuilder {
    pub system_message: Option<String>,
    pub user_message: Option<String>,
}

impl LlamaRequest {
    pub fn builder() -> LlamaRequestBuilder {
        LlamaRequestBuilder::default()
    }
}

impl LlamaRequestBuilder {
    pub fn system_message(mut self, message: impl Into<String>) -> Self {
        self.system_message = Some(message.into());
        self
    }

    pub fn user_message(mut self, message: impl Into<String>) -> Self {
        self.user_message = Some(message.into());
        self
    }

    pub fn build(self) -> LlamaRequest {
        LlamaRequest {
            messages: [
                LlamaChatMessage::new("system".into(), self.system_message.unwrap()).unwrap(),
                LlamaChatMessage::new("user".into(), self.user_message.unwrap()).unwrap(),
            ],
        }
    }
}
