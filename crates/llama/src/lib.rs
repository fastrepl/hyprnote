use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, OnceLock};

use llama_cpp_2::{
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::{params::LlamaModelParams, AddBos, LlamaChatTemplate, LlamaModel, Special},
    sampling::LlamaSampler,
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

pub enum ModelName {
    HyprLLM,
    Other(Option<String>),
}

pub struct Llama {
    pub name: ModelName,
    task_sender: tokio::sync::mpsc::UnboundedSender<Task>,
}

pub enum Task {
    Generate {
        request: LlamaRequest,
        response_sender: tokio::sync::mpsc::UnboundedSender<String>,
        callback: Box<dyn FnMut(f64) + Send + 'static>,
    },
}

struct ProgressData {
    total: usize,
    processed: AtomicUsize,
    enabled: AtomicBool,
    callback: Mutex<Box<dyn FnMut(f64) + Send + 'static>>,
    last_reported: Mutex<i32>,
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
        let mut samplers = Vec::new();

        if let Some(grammar) = grammar {
            if let Some(grammar_sampler) = LlamaSampler::grammar(&model, grammar, "root") {
                samplers.push(grammar_sampler);
            }
        }

        samplers.push(LlamaSampler::temp(0.8));
        samplers.push(LlamaSampler::penalties(0, 1.4, 0.1, 0.0));
        samplers.push(LlamaSampler::mirostat_v2(1234, 3.0, 0.2));

        LlamaSampler::chain_simple(samplers)
    }

    fn process_prefill<'a>(
        model: &'a LlamaModel,
        backend: &LlamaBackend,
        tpl: &LlamaChatTemplate,
        request: &LlamaRequest,
        callback: Box<dyn FnMut(f64) + Send + 'static>,
    ) -> Result<
        (
            llama_cpp_2::context::LlamaContext<'a>,
            LlamaBatch,
            i32,
            *mut std::ffi::c_void,
        ),
        crate::Error,
    > {
        let prompt = model
            .apply_chat_template(tpl, &request.messages, true)
            .unwrap();

        let mut tokens_list = model.str_to_token(&prompt, AddBos::Always).unwrap();
        tokens_list.truncate(DEFAULT_MAX_INPUT_TOKENS as usize);
        let input_tokens_len = tokens_list.len() as u32;

        let progress_data = Box::new(ProgressData {
            total: input_tokens_len as usize,
            processed: AtomicUsize::new(0),
            enabled: AtomicBool::new(true),
            callback: Mutex::new(callback),
            last_reported: Mutex::new(-1),
        });
        let progress_data_ptr = Box::into_raw(progress_data) as *mut std::ffi::c_void;

        extern "C" fn cb_eval_fn(
            _t: *mut llama_cpp_sys_2::ggml_tensor,
            _ask: bool,
            user_data: *mut std::ffi::c_void,
        ) -> bool {
            if user_data.is_null() {
                return false;
            }

            unsafe {
                let progress_data = &*(user_data as *mut ProgressData);

                if progress_data.enabled.load(Ordering::Relaxed) {
                    let count = progress_data.processed.fetch_add(1, Ordering::Relaxed) + 1;

                    let mut progress = (count as f64) / ((progress_data.total * 2) as f64);
                    if progress > 1.0 {
                        progress = 1.0;
                    }

                    let rounded_progress_int = (progress * 100.0).round() as i32;

                    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        if let Ok(mut last_reported) = progress_data.last_reported.lock() {
                            if *last_reported != rounded_progress_int {
                                *last_reported = rounded_progress_int;
                                let rounded_progress = rounded_progress_int as f64 / 100.0;

                                if let Ok(mut cb) = progress_data.callback.lock() {
                                    (cb)(rounded_progress);
                                }
                            }
                        }
                    }));
                }
            }

            false
        }

        let mut ctx = model
            .new_context(
                backend,
                LlamaContextParams::default()
                    .with_n_ctx(std::num::NonZeroU32::new(
                        input_tokens_len + DEFAULT_MAX_OUTPUT_TOKENS,
                    ))
                    .with_n_batch(input_tokens_len)
                    .with_embeddings(false)
                    .with_swa_full(false)
                    .with_flash_attention(true)
                    .with_cb_eval_user_data(progress_data_ptr)
                    .with_cb_eval(Some(cb_eval_fn)),
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

        unsafe {
            let progress_data = &*(progress_data_ptr as *mut ProgressData);
            progress_data.enabled.store(false, Ordering::Relaxed);

            let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                if let Ok(mut cb) = progress_data.callback.lock() {
                    (cb)(1.0);
                }
            }));
        }

        Ok((ctx, batch, last_index, progress_data_ptr))
    }

    fn process_generation<'a>(
        model: &LlamaModel,
        mut ctx: llama_cpp_2::context::LlamaContext<'a>,
        mut batch: LlamaBatch,
        last_index: i32,
        request: &LlamaRequest,
        response_sender: tokio::sync::mpsc::UnboundedSender<String>,
        progress_data_ptr: *mut std::ffi::c_void,
    ) {
        let mut n_cur = batch.n_tokens();
        let mut decoder = encoding_rs::UTF_8.new_decoder();
        let mut sampler = Self::get_sampler(model, request.grammar.as_deref());

        while n_cur <= last_index + DEFAULT_MAX_OUTPUT_TOKENS as i32 {
            let token = sampler.sample(&ctx, batch.n_tokens() - 1);

            if model.is_eog_token(token) {
                break;
            }

            let output_bytes = model.token_to_bytes(token, Special::Tokenize).unwrap();
            let mut output_string = String::with_capacity(32);
            let _decode_result = decoder.decode_to_string(&output_bytes, &mut output_string, false);

            if cfg!(debug_assertions) {
                use std::io::{self, Write};
                print!("{}", output_string);
                io::stdout().flush().unwrap();
            }

            if response_sender.send(output_string).is_err() {
                break;
            }

            batch.clear();
            batch.add(token, n_cur, &[0], true).unwrap();

            n_cur += 1;
            ctx.decode(&mut batch).unwrap();
        }

        drop(response_sender);

        unsafe {
            let _ = Box::from_raw(progress_data_ptr as *mut ProgressData);
        }
    }

    pub fn new(model_path: impl AsRef<std::path::Path>) -> Result<Self, crate::Error> {
        let fmt = model_path.gguf_chat_format()?.unwrap();
        let tpl = LlamaChatTemplate::new(fmt.as_ref()).unwrap();

        let backend = Self::get_backend();
        let model = Self::load_model(model_path)?;
        let name = match model.meta_val_str("general.name") {
            Ok(name) if name == "hypr-llm" => ModelName::HyprLLM,
            Ok(name) => ModelName::Other(Some(name.to_string())),
            Err(_) => ModelName::Other(None),
        };

        let (task_sender, mut task_receiver) = tokio::sync::mpsc::unbounded_channel::<Task>();

        std::thread::spawn({
            move || {
                while let Some(task) = task_receiver.blocking_recv() {
                    match task {
                        Task::Generate {
                            request,
                            response_sender,
                            callback,
                        } => {
                            match Self::process_prefill(&model, &backend, &tpl, &request, callback)
                            {
                                Ok((ctx, batch, last_index, progress_data_ptr)) => {
                                    Self::process_generation(
                                        &model,
                                        ctx,
                                        batch,
                                        last_index,
                                        &request,
                                        response_sender,
                                        progress_data_ptr,
                                    );
                                }
                                Err(e) => {
                                    tracing::error!("Prefill failed: {:?}", e);
                                    drop(response_sender);
                                }
                            }
                        }
                    }
                }
            }
        });

        Ok(Self { name, task_sender })
    }

    pub fn generate_stream(
        &self,
        request: LlamaRequest,
    ) -> Result<impl futures_util::Stream<Item = String>, crate::Error> {
        let callback = Box::new(|_| {});
        self.generate_stream_with_callback(request, callback)
    }

    pub fn generate_stream_with_callback(
        &self,
        request: LlamaRequest,
        callback: Box<dyn FnMut(f64) + Send + 'static>,
    ) -> Result<impl futures_util::Stream<Item = String>, crate::Error> {
        let (response_sender, response_receiver) = tokio::sync::mpsc::unbounded_channel::<String>();

        let task = Task::Generate {
            request,
            response_sender,
            callback,
        };

        self.task_sender.send(task)?;
        let stream = UnboundedReceiverStream::new(response_receiver);

        Ok(stream)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    async fn run(model: &Llama, request: LlamaRequest) -> String {
        use futures_util::pin_mut;

        let stream = model
            .generate_stream_with_callback(
                request,
                Box::new(|progress| println!("progress: {}", progress)),
            )
            .unwrap();
        pin_mut!(stream);

        let mut acc = String::new();

        while let Some(token) = stream.next().await {
            acc += &token;
        }

        acc
    }

    fn get_model() -> Llama {
        let model_path = dirs::data_dir()
            .unwrap()
            .join("com.hyprnote.dev")
            .join("ttt/llm.gguf");

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
            grammar: Some(hypr_gbnf::GBNF::EnhanceOther.build()),
            messages: vec![
                LlamaChatMessage::new(
                    "system".into(),
                    "Summarize the text the user gives you.".into(),
                )
                .unwrap(),
                LlamaChatMessage::new("user".into(), hypr_data::english_3::WORDS_JSON.repeat(1))
                    .unwrap(),
            ],
        };

        run(&llama, request).await;
    }
}
