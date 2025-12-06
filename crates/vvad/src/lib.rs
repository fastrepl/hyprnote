mod earshot_impl {
    use earshot::VoiceActivityProfile;

    pub struct VoiceActivityDetector {
        inner: earshot::VoiceActivityDetector,
    }

    impl VoiceActivityDetector {
        pub fn new() -> Self {
            Self {
                inner: earshot::VoiceActivityDetector::new(VoiceActivityProfile::QUALITY),
            }
        }

        pub fn predict_16khz(&mut self, samples: &[i16]) -> Result<bool, ()> {
            self.inner.predict_16khz(samples).map_err(|_| ())
        }
    }

    impl Default for VoiceActivityDetector {
        fn default() -> Self {
            Self::new()
        }
    }
}

pub use earshot_impl::*;
