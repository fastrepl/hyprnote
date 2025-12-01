use super::SttAdapter;

#[derive(Clone, Default)]
pub struct DeepgramAdapter;

impl SttAdapter for DeepgramAdapter {
    fn supports_native_multichannel(&self) -> bool {
        true
    }
}
