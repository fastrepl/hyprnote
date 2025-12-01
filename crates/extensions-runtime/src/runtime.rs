use crate::ops::*;
use crate::{Error, Extension, Result};
use deno_core::serde_json::Value;
use deno_core::serde_v8;
use deno_core::v8;
use deno_core::JsRuntime;
use deno_core::RuntimeOptions;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, oneshot};

deno_core::extension!(
    hypr_extension,
    ops = [op_hypr_log, op_hypr_log_error, op_hypr_log_warn],
);

pub enum RuntimeRequest {
    CallFunction {
        extension_id: String,
        function_name: String,
        args: Vec<Value>,
        responder: oneshot::Sender<Result<Value>>,
    },
    LoadExtension {
        extension: Extension,
        responder: oneshot::Sender<Result<()>>,
    },
    ExecuteCode {
        extension_id: String,
        code: String,
        responder: oneshot::Sender<Result<Value>>,
    },
    Shutdown,
}

#[derive(Clone)]
pub struct ExtensionsRuntime {
    sender: mpsc::Sender<RuntimeRequest>,
    available: Arc<AtomicBool>,
}

impl ExtensionsRuntime {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel(100);
        let available = Arc::new(AtomicBool::new(false));
        let available_clone = available.clone();

        std::thread::spawn(move || {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .expect("Failed to build tokio runtime");

                available_clone.store(true, Ordering::SeqCst);
                tracing::info!("extensions_runtime_initialized");

                rt.block_on(runtime_loop(rx));
            }));

            if let Err(e) = result {
                let panic_msg = if let Some(s) = e.downcast_ref::<&str>() {
                    s.to_string()
                } else if let Some(s) = e.downcast_ref::<String>() {
                    s.clone()
                } else {
                    "Unknown panic".to_string()
                };
                tracing::error!(
                    "extensions_runtime_failed: {}. Extensions feature will be unavailable.",
                    panic_msg
                );
            }
        });

        Self {
            sender: tx,
            available,
        }
    }

    pub fn is_available(&self) -> bool {
        self.available.load(Ordering::SeqCst)
    }

    fn ensure_available(&self) -> Result<()> {
        if self.is_available() {
            Ok(())
        } else {
            Err(Error::RuntimeUnavailable)
        }
    }

    pub async fn load_extension(&self, extension: Extension) -> Result<()> {
        self.ensure_available()?;

        let (tx, rx) = oneshot::channel();
        self.sender
            .send(RuntimeRequest::LoadExtension {
                extension,
                responder: tx,
            })
            .await
            .map_err(|_| Error::ChannelSend)?;

        rx.await.map_err(|_| Error::ChannelRecv)?
    }

    pub async fn call_function(
        &self,
        extension_id: &str,
        function_name: &str,
        args: Vec<Value>,
    ) -> Result<Value> {
        self.ensure_available()?;

        let (tx, rx) = oneshot::channel();
        self.sender
            .send(RuntimeRequest::CallFunction {
                extension_id: extension_id.to_string(),
                function_name: function_name.to_string(),
                args,
                responder: tx,
            })
            .await
            .map_err(|_| Error::ChannelSend)?;

        rx.await.map_err(|_| Error::ChannelRecv)?
    }

    pub async fn execute_code(&self, extension_id: &str, code: &str) -> Result<Value> {
        self.ensure_available()?;

        let (tx, rx) = oneshot::channel();
        self.sender
            .send(RuntimeRequest::ExecuteCode {
                extension_id: extension_id.to_string(),
                code: code.to_string(),
                responder: tx,
            })
            .await
            .map_err(|_| Error::ChannelSend)?;

        rx.await.map_err(|_| Error::ChannelRecv)?
    }

    pub async fn shutdown(&self) -> Result<()> {
        if !self.is_available() {
            return Ok(());
        }

        self.sender
            .send(RuntimeRequest::Shutdown)
            .await
            .map_err(|_| Error::ChannelSend)?;
        Ok(())
    }
}

impl Default for ExtensionsRuntime {
    fn default() -> Self {
        Self::new()
    }
}

struct ExtensionState {
    extension: Extension,
    functions: HashMap<String, v8::Global<v8::Function>>,
}

async fn runtime_loop(mut rx: mpsc::Receiver<RuntimeRequest>) {
    let mut js_runtime = JsRuntime::new(RuntimeOptions {
        extensions: vec![hypr_extension::init_ops()],
        ..Default::default()
    });

    js_runtime
        .execute_script(
            "<hypr:init>",
            r#"
            globalThis.hypr = {
                log: {
                    info: (msg) => Deno.core.ops.op_hypr_log(String(msg)),
                    error: (msg) => Deno.core.ops.op_hypr_log_error(String(msg)),
                    warn: (msg) => Deno.core.ops.op_hypr_log_warn(String(msg)),
                },
                _internal: {
                    extensionId: null,
                },
            };
            // Backwards compatibility
            hypr.log.toString = () => "[object Function]";
            const originalLog = hypr.log;
            globalThis.hypr.log = Object.assign(
                (msg) => Deno.core.ops.op_hypr_log(String(msg)),
                originalLog
            );
            "#,
        )
        .expect("Failed to initialize hypr global");

    let mut extensions: HashMap<String, ExtensionState> = HashMap::new();

    while let Some(request) = rx.recv().await {
        match request {
            RuntimeRequest::LoadExtension {
                extension,
                responder,
            } => {
                let result = load_extension_impl(&mut js_runtime, extension, &mut extensions);
                let _ = responder.send(result);
            }
            RuntimeRequest::CallFunction {
                extension_id,
                function_name,
                args,
                responder,
            } => {
                let result = call_function_impl(
                    &mut js_runtime,
                    &extensions,
                    &extension_id,
                    &function_name,
                    args,
                )
                .await;
                let _ = responder.send(result);
            }
            RuntimeRequest::ExecuteCode {
                extension_id: _,
                code,
                responder,
            } => {
                let result = execute_code_impl(&mut js_runtime, code);
                let _ = responder.send(result);
            }
            RuntimeRequest::Shutdown => {
                break;
            }
        }
    }
}

fn load_extension_impl(
    js_runtime: &mut JsRuntime,
    extension: Extension,
    extensions: &mut HashMap<String, ExtensionState>,
) -> Result<()> {
    let entry_path = extension.entry_path();
    let code = std::fs::read_to_string(&entry_path)?;

    let context_json = serde_json::json!({
        "extensionId": extension.manifest.id,
        "extensionPath": extension.path.to_string_lossy(),
        "manifest": {
            "id": extension.manifest.id,
            "name": extension.manifest.name,
            "version": extension.manifest.version,
            "description": extension.manifest.description,
            "apiVersion": extension.manifest.api_version,
        }
    });

    let wrapper = format!(
        r#"
        (function() {{
            const __hypr_extension = {{}};
            const __hypr_context = {context};
            hypr._internal.extensionId = __hypr_context.extensionId;
            {code}
            if (typeof __hypr_extension.activate === 'function') {{
                __hypr_extension.activate(__hypr_context);
            }}
            return __hypr_extension;
        }})()
        "#,
        context = context_json,
        code = code
    );

    let script_name: &'static str = Box::leak(extension.manifest.id.clone().into_boxed_str());
    let result = js_runtime
        .execute_script(script_name, wrapper)
        .map_err(|e| Error::RuntimeError(e.to_string()))?;

    let scope = &mut js_runtime.handle_scope();
    let local = v8::Local::new(scope, result);

    let mut functions = HashMap::new();

    if let Ok(obj) = v8::Local::<v8::Object>::try_from(local) {
        if let Some(names) = obj.get_own_property_names(scope, v8::GetPropertyNamesArgs::default())
        {
            for i in 0..names.length() {
                if let Some(key) = names.get_index(scope, i) {
                    let key_str = key.to_rust_string_lossy(scope);
                    if let Some(value) = obj.get(scope, key) {
                        if let Ok(func) = v8::Local::<v8::Function>::try_from(value) {
                            let global_func = v8::Global::new(scope, func);
                            functions.insert(key_str, global_func);
                        }
                    }
                }
            }
        }
    }

    extensions.insert(
        extension.manifest.id.clone(),
        ExtensionState {
            extension: extension.clone(),
            functions,
        },
    );

    tracing::info!(
        "Loaded extension: {} v{} (API v{})",
        extension.manifest.name,
        extension.manifest.version,
        extension.manifest.api_version
    );

    Ok(())
}

fn execute_code_impl(js_runtime: &mut JsRuntime, code: String) -> Result<Value> {
    let result = js_runtime
        .execute_script("<hypr:execute_code>", code)
        .map_err(|e| Error::RuntimeError(e.to_string()))?;

    let scope = &mut js_runtime.handle_scope();
    let local = v8::Local::new(scope, result);
    let value: Value =
        serde_v8::from_v8(scope, local).map_err(|e| Error::RuntimeError(e.to_string()))?;

    Ok(value)
}

async fn call_function_impl(
    js_runtime: &mut JsRuntime,
    extensions: &HashMap<String, ExtensionState>,
    extension_id: &str,
    function_name: &str,
    args: Vec<Value>,
) -> Result<Value> {
    let ext_state = extensions
        .get(extension_id)
        .ok_or_else(|| Error::ExtensionNotFound(extension_id.to_string()))?;

    let func = ext_state
        .functions
        .get(function_name)
        .ok_or_else(|| Error::RuntimeError(format!("Function not found: {}", function_name)))?;

    let v8_args = {
        let scope = &mut js_runtime.handle_scope();
        let mut result = Vec::with_capacity(args.len());
        for arg in &args {
            let v8_val =
                serde_v8::to_v8(scope, arg).map_err(|e| Error::RuntimeError(e.to_string()))?;
            result.push(v8::Global::new(scope, v8_val));
        }
        result
    };

    let result = js_runtime
        .call_with_args(func, &v8_args)
        .await
        .map_err(|e| Error::RuntimeError(e.to_string()))?;

    let scope = &mut js_runtime.handle_scope();
    let local = v8::Local::new(scope, result);
    let value: Value =
        serde_v8::from_v8(scope, local).map_err(|e| Error::RuntimeError(e.to_string()))?;

    Ok(value)
}
