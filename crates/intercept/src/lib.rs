use std::{collections::HashMap, sync::LazyLock, sync::Mutex};
#[cfg(target_os = "macos")]
use swift_rs::swift;

type QuitHandler = Box<dyn Fn() -> bool + Send + Sync>;
type QuitHandlerMap = Mutex<HashMap<&'static str, QuitHandler>>;

static QUIT_HANDLERS: LazyLock<QuitHandlerMap> = LazyLock::new(|| Mutex::new(HashMap::new()));

#[cfg(target_os = "macos")]
swift!(fn _setup_quit_handler());

#[cfg(target_os = "macos")]
static SWIFT_HANDLER_INITIALIZED: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);

pub fn register_quit_handler<F>(id: &'static str, callback: F)
where
    F: Fn() -> bool + Send + Sync + 'static,
{
    QUIT_HANDLERS.lock().unwrap().insert(id, Box::new(callback));

    #[cfg(target_os = "macos")]
    {
        if !SWIFT_HANDLER_INITIALIZED.swap(true, std::sync::atomic::Ordering::SeqCst) {
            unsafe {
                _setup_quit_handler();
            }
        }
    }
}

pub fn unregister_quit_handler(id: &'static str) {
    QUIT_HANDLERS.lock().unwrap().remove(id);
}

#[unsafe(no_mangle)]
#[cfg(target_os = "macos")]
pub extern "C" fn rust_should_quit() -> bool {
    QUIT_HANDLERS
        .lock()
        .unwrap()
        .values()
        .all(|callback| callback())
}
