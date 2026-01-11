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

#[cfg(target_os = "macos")]
#[derive(Debug, Clone, Copy)]
pub struct DeviceState {
    pub is_headphone: Option<bool>,
    pub is_foldable: bool,
    pub is_display_inactive: bool,
    pub has_builtin_mic: bool,
    pub is_input_external: bool,
    pub is_output_external: bool,
}

#[cfg(target_os = "macos")]
fn determine_from_state(onboarding: bool, state: DeviceState) -> ChannelMode {
    if onboarding {
        return ChannelMode::SpeakerOnly;
    }

    if state.is_headphone == Some(true) {
        return ChannelMode::MicAndSpeaker;
    }

    let input_is_builtin = state.has_builtin_mic && !state.is_input_external;
    let output_is_builtin = !state.is_output_external;

    if input_is_builtin && state.is_foldable && state.is_display_inactive {
        return ChannelMode::SpeakerOnly;
    }

    if input_is_builtin && output_is_builtin {
        return ChannelMode::MicOnly;
    }

    ChannelMode::MicAndSpeaker
}

impl ChannelMode {
    #[cfg(target_os = "macos")]
    pub fn determine(onboarding: bool) -> Self {
        use hypr_device_heuristic::macos::*;

        determine_from_state(
            onboarding,
            DeviceState {
                is_headphone: is_headphone_from_default_output_device(),
                is_foldable: is_builtin_display_foldable(),
                is_display_inactive: is_builtin_display_inactive(),
                has_builtin_mic: has_builtin_mic(),
                is_input_external: is_default_input_external(),
                is_output_external: is_default_output_external(),
            },
        )
    }

    #[cfg(target_os = "linux")]
    pub fn determine(onboarding: bool) -> Self {
        if onboarding {
            return ChannelMode::SpeakerOnly;
        }

        if hypr_device_heuristic::linux::is_headphone_from_default_output_device() == Some(true) {
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

#[cfg(test)]
#[cfg(target_os = "macos")]
mod test {
    use super::*;
    use quickcheck::{Arbitrary, Gen};

    fn arbitrary_headphone_detection(g: &mut Gen) -> Option<bool> {
        if bool::arbitrary(g) { Some(true) } else { None }
    }

    impl Arbitrary for DeviceState {
        fn arbitrary(g: &mut Gen) -> Self {
            DeviceState {
                is_headphone: arbitrary_headphone_detection(g),
                is_foldable: bool::arbitrary(g),
                is_display_inactive: bool::arbitrary(g),
                has_builtin_mic: bool::arbitrary(g),
                is_input_external: bool::arbitrary(g),
                is_output_external: bool::arbitrary(g),
            }
        }
    }

    #[quickcheck_macros::quickcheck]
    fn prop_onboarding_always_speaker_only(state: DeviceState) -> bool {
        determine_from_state(true, state) == ChannelMode::SpeakerOnly
    }

    #[quickcheck_macros::quickcheck]
    fn prop_headphone_detected_always_mic_and_speaker(state: DeviceState) -> bool {
        let state = DeviceState {
            is_headphone: Some(true),
            ..state
        };
        determine_from_state(false, state) == ChannelMode::MicAndSpeaker
    }
}
