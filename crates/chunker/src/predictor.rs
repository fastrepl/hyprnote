pub trait Predictor: Send + Sync {
    fn predict(&self, samples: &[f32]) -> Result<f32, crate::Error>;
    fn window_samples(&self, sr: u32) -> usize;
}

#[derive(Debug)]
pub struct RMS {}

impl RMS {
    pub fn new() -> Self {
        Self {}
    }
}

impl Predictor for RMS {
    fn predict(&self, samples: &[f32]) -> Result<f32, crate::Error> {
        if samples.is_empty() {
            return Ok(0.0);
        }

        let sum_squares: f32 = samples.iter().map(|&sample| sample * sample).sum();
        let mean_square = sum_squares / samples.len() as f32;
        let rms = mean_square.sqrt();
        Ok(if rms > 0.009 { 1.0 } else { 0.0 })
    }

    fn window_samples(&self, sr: u32) -> usize {
        ((sr / 1000) * 30) as usize
    }
}

#[derive(Debug)]
pub struct Silero {
    #[allow(dead_code)]
    inner: std::sync::Mutex<hypr_vad::Vad>,
}

impl Silero {
    pub fn new() -> Result<Self, crate::Error> {
        Ok(Self {
            inner: std::sync::Mutex::new(hypr_vad::Vad::new()?),
        })
    }
}

impl Predictor for Silero {
    fn predict(&self, samples: &[f32]) -> Result<f32, crate::Error> {
        let prob = self.inner.lock().unwrap().run(samples)?;
        Ok(prob)
    }

    fn window_samples(&self, sr: u32) -> usize {
        ((sr / 1000) * 30) as usize
    }
}
