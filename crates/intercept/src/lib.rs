use std::sync::Mutex;
#[cfg(target_os = "macos")]
use swift_rs::swift;

static QUIT_CALLBACK: Mutex<Option<Box<dyn Fn() -> bool + Send + Sync>>> = Mutex::new(None);

#[cfg(target_os = "macos")]
swift!(fn _setup_quit_handler());

pub fn setup_quit_handler<F>(callback: F)
where
    F: Fn() -> bool + Send + Sync + 'static,
{
    #[cfg(target_os = "macos")]
    {
        *QUIT_CALLBACK.lock().unwrap() = Some(Box::new(callback));
        unsafe {
            _setup_quit_handler();
        }
    }
}

#[no_mangle]
#[cfg(target_os = "macos")]
pub extern "C" fn rust_should_quit() -> bool {
    QUIT_CALLBACK
        .lock()
        .unwrap()
        .as_ref()
        .map_or(true, |callback| callback())
}
