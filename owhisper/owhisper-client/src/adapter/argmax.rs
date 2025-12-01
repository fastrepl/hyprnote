use super::SttAdapter;

#[derive(Clone, Default)]
pub struct ArgmaxAdapter;

impl SttAdapter for ArgmaxAdapter {
    fn supports_native_multichannel(&self) -> bool {
        false
    }
}
