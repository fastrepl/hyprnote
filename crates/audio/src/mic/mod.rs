#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::{MicInput, MicStream};

#[cfg(not(target_os = "macos"))]
pub use kalosm_sound::{MicInput, MicStream};
