use crate::ops::*;
use crate::{Error, Extension, Result};
use deno_core::serde_json::Value;
use deno_core::serde_v8;
use deno_core::v8;
use deno_core::JsRuntime;
use deno_core::RuntimeOptions;
use std::collections::HashMap;
use tokio::sync::{mpsc, oneshot};

deno_core::extension!(hypr_extension, ops = [op_hypr_log],);

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

pub struct ExtensionsRuntime {
    sender: mpsc::Sender<RuntimeRequest>,
}

impl ExtensionsRuntime {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel(100);

        std::thread::spawn(move || {
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .unwrap();

            rt.block_on(runtime_loop(rx));
        });

        Self { sender: tx }
    }

    pub async fn load_extension(&self, extension: Extension) -> Result<()> {
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
                log: (msg) => Deno.core.ops.op_hypr_log(String(msg)),
            };
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
                extension_id,
                code,
                responder,
            } => {
                let result = execute_code_impl(&mut js_runtime, extension_id, code);
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

    let wrapper = format!(
        r#"
        (function() {{
            const __hypr_extension = {{}};
            {}
            return __hypr_extension;
        }})()
        "#,
        code
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
        "Loaded extension: {} v{}",
        extension.manifest.name,
        extension.manifest.version
    );

    Ok(())
}

fn execute_code_impl(
    js_runtime: &mut JsRuntime,
    extension_id: String,
    code: String,
) -> Result<Value> {
    let script_name: &'static str = Box::leak(extension_id.into_boxed_str());
    let result = js_runtime
        .execute_script(script_name, code)
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
        args.iter()
            .map(|arg| {
                let v8_val = serde_v8::to_v8(scope, arg).unwrap();
                v8::Global::new(scope, v8_val)
            })
            .collect::<Vec<_>>()
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
