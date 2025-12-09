mod earshot_impl {
    use earshot::VoiceActivityProfile;

    #[derive(Debug, thiserror::Error)]
    #[error("voice activity detection failed")]
    pub struct VadError;

    pub struct VoiceActivityDetector {
        inner: earshot::VoiceActivityDetector,
    }

    impl VoiceActivityDetector {
        pub fn new() -> Self {
            Self {
                inner: earshot::VoiceActivityDetector::new(VoiceActivityProfile::QUALITY),
            }
        }

        pub fn predict_16khz(&mut self, samples: &[i16]) -> Result<bool, VadError> {
            self.inner.predict_16khz(samples).map_err(|_| VadError)
        }
    }

    impl Default for VoiceActivityDetector {
        fn default() -> Self {
            Self::new()
        }
    }
}

pub use earshot_impl::*;
