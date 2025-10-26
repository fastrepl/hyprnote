use std::path::PathBuf;

pub trait TracingPluginExt<R: tauri::Runtime> {
    fn logs_dir(&self, bundle_id: impl Into<String>) -> Result<PathBuf, crate::Error>;
    fn do_log(&self, level: Level, data: Vec<serde_json::Value>) -> Result<(), crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> TracingPluginExt<R> for T {
    fn logs_dir(&self, bundle_id: impl Into<String>) -> Result<PathBuf, crate::Error> {
        let base_dir = dirs::data_dir().unwrap();
        let logs_dir = base_dir.join(bundle_id.into()).join("logs");
        let _ = std::fs::create_dir_all(&logs_dir);
        Ok(logs_dir)
    }

    fn do_log(&self, level: Level, data: Vec<serde_json::Value>) -> Result<(), crate::Error> {
        match level {
            Level::Trace => {
                tracing::trace!("{:?}", data);
            }
            Level::Debug => {
                tracing::debug!("{:?}", data);
            }
            Level::Info => {
                tracing::info!("{:?}", data);
            }
            Level::Warn => {
                tracing::warn!("{:?}", data);
            }
            Level::Error => {
                tracing::error!("{:?}", data);
            }
        }
        Ok(())
    }
}

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub enum Level {
    #[serde(rename = "TRACE")]
    Trace,
    #[serde(rename = "DEBUG")]
    Debug,
    #[serde(rename = "INFO")]
    Info,
    #[serde(rename = "WARN")]
    Warn,
    #[serde(rename = "ERROR")]
    Error,
}

pub const JS_INIT_SCRIPT: &str = r#"
(function() {
    function initConsoleOverride() {
        if (typeof window.__TAURI__ === 'undefined' || 
            typeof window.__TAURI__.core === 'undefined' ||
            typeof window.__TAURI__.core.invoke === 'undefined') {
            setTimeout(initConsoleOverride, 10);
            return;
        }
        
        const originalLog = console.log.bind(console);
        const originalDebug = console.debug.bind(console);
        const originalInfo = console.info.bind(console);
        const originalWarn = console.warn.bind(console);
        const originalError = console.error.bind(console);
        
        const invoke = window.__TAURI__.core.invoke;
        const log = (level, ...args) => invoke('plugin:tracing|do_log', { level, data: args });
        
        console.log = (...args) => { originalLog(...args); log('INFO', ...args); };
        console.debug = (...args) => { originalDebug(...args); log('DEBUG', ...args); };
        console.info = (...args) => { originalInfo(...args); log('INFO', ...args); };
        console.warn = (...args) => { originalWarn(...args); log('WARN', ...args); };
        console.error = (...args) => { originalError(...args); log('ERROR', ...args); };
    }
    
    initConsoleOverride();
})();
"#;

#[cfg(test)]
mod tests {
    use rquickjs::{Context, Runtime};

    fn setup_runtime() -> (Runtime, Context) {
        let runtime = Runtime::new().unwrap();
        let context = Context::full(&runtime).unwrap();
        context.with(|_ctx| {});
        (runtime, context)
    }

    #[test]
    fn test_js_init_script() {
        let (_rt, ctx) = setup_runtime();
        ctx.with(|ctx| {
            let setup = r#"
                globalThis.window = globalThis;
                globalThis.setTimeout = function(fn, delay) { fn(); };
                
                if (typeof globalThis.console === 'undefined') {
                    globalThis.console = {
                        log: function() {},
                        debug: function() {},
                        info: function() {},
                        warn: function() {},
                        error: function() {}
                    };
                }
                
                globalThis.window.__TAURI__ = {
                    core: {
                        invoke: function() { return Promise.resolve(); }
                    }
                };
            "#;
            ctx.eval::<(), _>(setup).unwrap();
            ctx.eval::<(), _>(super::JS_INIT_SCRIPT).unwrap();

            let console_methods_exist: bool = ctx
                .eval(
                    r#"
                    typeof console !== 'undefined' && 
                    typeof console.log === 'function' &&
                    typeof console.debug === 'function' &&
                    typeof console.info === 'function' &&
                    typeof console.warn === 'function' &&
                    typeof console.error === 'function'
                "#,
                )
                .unwrap();

            assert!(
                console_methods_exist,
                "All console methods should be defined"
            );
        });
    }
}
