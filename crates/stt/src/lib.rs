mod deepgram;
mod types;

#[cfg(feature = "realtime")]
pub mod realtime;

#[cfg(feature = "recorded")]
pub mod recorded;
