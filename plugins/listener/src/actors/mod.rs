mod listener;
mod recorder;
mod root;
mod session;
mod source;

pub use listener::*;
pub use recorder::*;
pub use root::*;
pub use session::*;
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
    #[cfg(target_os = "macos")]
    pub fn determine(onboarding: bool) -> Self {
        if onboarding {
            return ChannelMode::SpeakerOnly;
        }

        use hypr_device_heuristic::macos::*;

        if is_headphone_from_default_output_device() {
            return ChannelMode::MicAndSpeaker;
        }

        if is_builtin_display_foldable() && is_builtin_display_inactive() {
            return ChannelMode::SpeakerOnly;
        }

        if has_builtin_mic() && !is_default_input_external() {
            return ChannelMode::MicOnly;
        }

        ChannelMode::MicAndSpeaker
    }

    #[cfg(target_os = "linux")]
    pub fn determine(onboarding: bool) -> Self {
        if onboarding {
            return ChannelMode::SpeakerOnly;
        }

        if hypr_device_heuristic::linux::is_headphone_from_default_output_device() {
            return ChannelMode::MicAndSpeaker;
        }

        ChannelMode::MicAndSpeaker
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    pub fn determine(_onboarding: bool) -> Self {
        ChannelMode::MicAndSpeaker
    }

    pub fn uses_mic(self) -> bool {
        matches!(self, ChannelMode::MicOnly | ChannelMode::MicAndSpeaker)
    }

    pub fn uses_speaker(self) -> bool {
        matches!(self, ChannelMode::SpeakerOnly | ChannelMode::MicAndSpeaker)
    }
}

#[derive(Clone)]
pub struct AudioChunk {
    pub data: Vec<f32>,
}
