mod listener;
mod recorder;
mod source;

pub use listener::*;
pub use recorder::*;
pub use source::*;

#[cfg(target_os = "macos")]
pub const SAMPLE_RATE: u32 = 16 * 1000;
#[cfg(not(target_os = "macos"))]
pub const SAMPLE_RATE: u32 = 16 * 1000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChannelMode {
    MicOnly,
    SpeakerOnly,
    MicAndSpeaker,
}

impl ChannelMode {
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    pub fn determine(onboarding: bool) -> Self {
        if onboarding {
            ChannelMode::SpeakerOnly
        } else if hypr_audio::is_using_headphone() {
            ChannelMode::MicAndSpeaker
        } else {
            ChannelMode::MicOnly
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    pub fn determine(_onboarding: bool) -> Self {
        ChannelMode::MicAndSpeaker
    }
}

#[derive(Clone)]
pub struct AudioChunk {
    pub data: Vec<f32>,
}
