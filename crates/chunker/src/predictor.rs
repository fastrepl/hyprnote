pub trait Predictor: Send + Sync {
    fn predict(&self, samples: &[f32]) -> Result<bool, crate::Error>;
}

#[derive(Debug)]
pub struct RMS {}

impl RMS {
    pub fn new() -> Self {
        Self {}
    }
}

impl Predictor for RMS {
    fn predict(&self, samples: &[f32]) -> Result<bool, crate::Error> {
        if samples.is_empty() {
            return Ok(false);
        }

        let sum_squares: f32 = samples.iter().map(|&sample| sample * sample).sum();
        let mean_square = sum_squares / samples.len() as f32;
        let rms = mean_square.sqrt();
        Ok(rms > 0.009)
    }
}

#[derive(Debug)]
pub struct Silero {
    #[allow(dead_code)]
    inner: hypr_vad::Vad,
}

impl Silero {
    pub fn new() -> Result<Self, crate::Error> {
        Ok(Self {
            inner: hypr_vad::Vad::new()?,
        })
    }
}

impl Predictor for Silero {
    fn predict(&self, _samples: &[f32]) -> Result<bool, crate::Error> {
        Ok(true)
    }
}
