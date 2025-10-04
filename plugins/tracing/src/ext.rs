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
        
        const invoke = window.__TAURI__.core.invoke;
        const log = (level, ...args) => invoke('plugin:tracing|do_log', { level, data: args });
        
        console.log = (...args) => log('INFO', ...args);
        console.debug = (...args) => log('DEBUG', ...args);
        console.info = (...args) => log('INFO', ...args);
        console.warn = (...args) => log('WARN', ...args);
        console.error = (...args) => log('ERROR', ...args);
    }
    
    initConsoleOverride();
})();
"#;
