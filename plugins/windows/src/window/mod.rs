#[cfg(all(feature = "v0", feature = "v1"))]
compile_error!("Cannot enable both 'v0' and 'v1' features at the same time");

#[cfg(not(any(feature = "v0", feature = "v1")))]
compile_error!("Either 'v0' or 'v1' feature must be enabled");

#[cfg(feature = "v0")]
pub mod v0;
#[cfg(feature = "v1")]
pub mod v1;

#[cfg(feature = "v0")]
pub type AppWindow = v0::AppWindow;
#[cfg(feature = "v1")]
pub type AppWindow = v1::AppWindow;

pub trait WindowImpl:
    std::fmt::Display
    + std::str::FromStr
    + std::fmt::Debug
    + Clone
    + serde::Serialize
    + serde::de::DeserializeOwned
    + specta::Type
    + PartialEq
    + Eq
    + std::hash::Hash
    + Send
    + Sync
    + 'static
{
    fn label(&self) -> String {
        self.to_string()
    }

    fn title(&self) -> String;

    fn build_window(
        &self,
        app: &tauri::AppHandle<tauri::Wry>,
    ) -> Result<tauri::WebviewWindow, crate::Error>;
}
