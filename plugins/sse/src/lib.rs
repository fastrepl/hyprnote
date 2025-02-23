use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("sse")
        .invoke_handler(tauri::generate_handler![commands::ping])
        .build()
}
