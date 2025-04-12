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

mod error;
mod grammar;
mod message;
mod stream;

pub use error::*;
pub use message::*;
pub use stream::filter_tag;

const TEMPLATE_NAME: &str = "llama3";

const DEFAULT_MAX_INPUT_TOKENS: u32 = 1024 * 8;
const DEFAULT_MAX_OUTPUT_TOKENS: u32 = 1024;

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
        let tpl = LlamaChatTemplate::new(TEMPLATE_NAME).unwrap();

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
                                LlamaSampler::grammar(&model, grammar::MARKDOWN_GRAMMAR, "root"),
                                LlamaSampler::temp(0.5),
                                LlamaSampler::penalties(0, 1.2, 0.2, 0.0),
                                LlamaSampler::mirostat_v2(1234, 4.0, 0.1),
                            ]);

                            while n_cur <= last_index + DEFAULT_MAX_OUTPUT_TOKENS as i32 {
                                let token = sampler.sample(&ctx, batch.n_tokens() - 1);

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

                            drop(response_sender);
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

        let stream = UnboundedReceiverStream::new(response_receiver);

        Ok(stream::filter_tag(Box::pin(stream), "headers"))
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

    fn english_4_messages() -> Vec<LlamaChatMessage> {
        let timeline_view = {
            let (transcripts, diarizations): (
                Vec<hypr_listener_interface::TranscriptChunk>,
                Vec<hypr_listener_interface::DiarizationChunk>,
            ) = (
                serde_json::from_str(hypr_data::english_4::TRANSCRIPTION_JSON).unwrap(),
                serde_json::from_str(hypr_data::english_4::DIARIZATION_JSON).unwrap(),
            );

            let mut timeline = hypr_timeline::Timeline::default();

            for t in transcripts {
                timeline.add_transcription(t);
            }
            for d in diarizations {
                timeline.add_diarization(d);
            }

            timeline.view(hypr_timeline::TimelineFilter::default())
        };

        let mut env = hypr_template::minijinja::Environment::new();
        hypr_template::init(&mut env);

        let system = hypr_template::render(
            &env,
            hypr_template::PredefinedTemplate::EnhanceSystem.into(),
            &serde_json::json!({
                "config": {
                    "general": {
                        "display_language": "en"
                    }
                }
            })
            .as_object()
            .unwrap(),
        )
        .unwrap();

        let user = hypr_template::render(
            &env,
            hypr_template::PredefinedTemplate::EnhanceUser.into(),
            &serde_json::json!({
                "editor": "privacy aspect seems interesting",
                "timeline": timeline_view,
                "participants": vec!["yujonglee".to_string()],
            })
            .as_object()
            .unwrap(),
        )
        .unwrap();

        vec![
            LlamaChatMessage::new("system".into(), system.into()).unwrap(),
            LlamaChatMessage::new("user".into(), user.into()).unwrap(),
        ]
    }

    fn english_1_messages() -> Vec<LlamaChatMessage> {
        let timeline_view = {
            let (transcripts, diarizations): (
                Vec<hypr_listener_interface::TranscriptChunk>,
                Vec<hypr_listener_interface::DiarizationChunk>,
            ) = (
                serde_json::from_str(hypr_data::english_1::TRANSCRIPTION_JSON).unwrap(),
                serde_json::from_str(hypr_data::english_1::DIARIZATION_JSON).unwrap(),
            );

            let mut timeline = hypr_timeline::Timeline::default();

            for t in transcripts {
                timeline.add_transcription(t);
            }
            for d in diarizations {
                timeline.add_diarization(d);
            }

            timeline.view(hypr_timeline::TimelineFilter::default())
        };

        let mut env = hypr_template::minijinja::Environment::new();
        hypr_template::init(&mut env);

        let system = hypr_template::render(
            &env,
            hypr_template::PredefinedTemplate::EnhanceSystem.into(),
            &serde_json::json!({
                "config": {
                    "general": {
                        "display_language": "en"
                    }
                }
            })
            .as_object()
            .unwrap(),
        )
        .unwrap();

        let user = hypr_template::render(
            &env,
            hypr_template::PredefinedTemplate::EnhanceUser.into(),
            &serde_json::json!({
                "editor": "googling is the best way to find the answer",
                "timeline": timeline_view,
                "participants": vec!["yujonglee".to_string()],
            })
            .as_object()
            .unwrap(),
        )
        .unwrap();

        vec![
            LlamaChatMessage::new("system".into(), system.into()).unwrap(),
            LlamaChatMessage::new("user".into(), user.into()).unwrap(),
        ]
    }

    async fn print_stream(model: &Llama, request: LlamaRequest) {
        use futures_util::pin_mut;
        use std::io::{self, Write};

        let stream = model.generate_stream(request).unwrap();
        pin_mut!(stream);

        while let Some(token) = stream.next().await {
            print!("{}", token);
            io::stdout().flush().unwrap();
        }
        println!();
    }

    // cargo test test_english_4 -p llama -- --nocapture
    #[tokio::test]
    async fn test_english_4() {
        let llama = get_model();
        let request = LlamaRequest::new(english_4_messages());

        print_stream(&llama, request).await;
    }

    // cargo test test_english_1 -p llama -- --nocapture
    #[tokio::test]
    async fn test_english_1() {
        let llama = get_model();
        let request = LlamaRequest::new(english_1_messages());
        print_stream(&llama, request).await;
    }
}
