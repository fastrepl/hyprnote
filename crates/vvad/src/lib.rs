#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
mod am2_impl {
    use hypr_am2 as am2;

    pub struct VoiceActivityDetector {
        initialized: bool,
    }

    impl VoiceActivityDetector {
        pub fn new() -> Self {
            am2::init();
            let initialized = am2::vad::init();

            Self { initialized }
        }

        pub fn predict_16khz(&mut self, samples: &[i16]) -> Result<bool, ()> {
            if !self.initialized {
                return Ok(true);
            }

            let f32_samples: Vec<f32> = samples.iter().map(|&s| s as f32 / 32768.0).collect();
            let voice_activity = am2::vad::detect(&f32_samples);

            if voice_activity.is_empty() {
                return Ok(true);
            }

            let voice_count = voice_activity.iter().filter(|&&v| v).count();
            Ok(voice_count > voice_activity.len() / 2)
        }
    }

    impl Default for VoiceActivityDetector {
        fn default() -> Self {
            Self::new()
        }
    }
}

#[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
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

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
pub use am2_impl::*;

#[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
pub use earshot_impl::*;
