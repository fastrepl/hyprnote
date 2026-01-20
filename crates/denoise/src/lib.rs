mod error;
pub use error::Error;

#[cfg(feature = "default-model")]
use df::tract::{DfParams, DfTract, RuntimeParams};

pub const SAMPLE_RATE: usize = 48000;
pub const HOP_SIZE: usize = 480;

pub struct Denoiser {
    #[cfg(feature = "default-model")]
    model: DfTract,
}

impl Denoiser {
    #[cfg(feature = "default-model")]
    pub fn new() -> Result<Self, Error> {
        let df_params = DfParams::default();
        let runtime_params = RuntimeParams::default();

        let model = DfTract::new(df_params, &runtime_params)
            .map_err(|e| Error::InitError(e.to_string()))?;

        Ok(Self { model })
    }

    #[cfg(feature = "default-model")]
    pub fn sample_rate(&self) -> usize {
        self.model.sr
    }

    #[cfg(feature = "default-model")]
    pub fn hop_size(&self) -> usize {
        self.model.hop_size
    }

    #[cfg(feature = "default-model")]
    pub fn reset(&mut self) -> Result<(), Error> {
        self.model
            .init()
            .map_err(|e| Error::ProcessError(e.to_string()))
    }

    #[cfg(feature = "default-model")]
    pub fn process_frame(&mut self, input: &[f32], output: &mut [f32]) -> Result<f32, Error> {
        use ndarray::{ArrayView2, ArrayViewMut2};

        if input.len() != self.model.hop_size {
            return Err(Error::InvalidFrameSize {
                expected: self.model.hop_size,
                actual: input.len(),
            });
        }

        if output.len() != self.model.hop_size {
            return Err(Error::InvalidFrameSize {
                expected: self.model.hop_size,
                actual: output.len(),
            });
        }

        let noisy = ArrayView2::from_shape((1, self.model.hop_size), input)
            .map_err(|e| Error::ProcessError(e.to_string()))?;
        let mut enh = ArrayViewMut2::from_shape((1, self.model.hop_size), output)
            .map_err(|e| Error::ProcessError(e.to_string()))?;

        self.model
            .process(noisy, enh.view_mut())
            .map_err(|e| Error::ProcessError(e.to_string()))
    }

    #[cfg(feature = "default-model")]
    pub fn process(&mut self, input: &[f32]) -> Result<Vec<f32>, Error> {
        let hop_size = self.model.hop_size;
        if input.len() % hop_size != 0 {
            return Err(Error::InvalidFrameSize {
                expected: hop_size,
                actual: input.len(),
            });
        }
        let num_frames = input.len() / hop_size;
        let mut output = vec![0.0f32; num_frames * hop_size];

        for i in 0..num_frames {
            let start = i * hop_size;
            let end = start + hop_size;
            self.process_frame(&input[start..end], &mut output[start..end])?;
        }

        Ok(output)
    }
}

#[cfg(all(test, feature = "default-model"))]
mod tests {
    use super::*;

    #[test]
    fn test_denoiser_creation() {
        let denoiser = Denoiser::new();
        assert!(denoiser.is_ok());
    }

    #[test]
    fn test_denoiser_sample_rate() {
        let denoiser = Denoiser::new().unwrap();
        assert_eq!(denoiser.sample_rate(), SAMPLE_RATE);
    }

    #[test]
    fn test_denoiser_hop_size() {
        let denoiser = Denoiser::new().unwrap();
        assert_eq!(denoiser.hop_size(), HOP_SIZE);
    }

    #[test]
    fn test_process_frame() {
        let mut denoiser = Denoiser::new().unwrap();
        let input = vec![0.0f32; HOP_SIZE];
        let mut output = vec![0.0f32; HOP_SIZE];

        let result = denoiser.process_frame(&input, &mut output);
        assert!(result.is_ok());
    }

    #[test]
    fn test_process() {
        let mut denoiser = Denoiser::new().unwrap();
        let input = vec![0.0f32; HOP_SIZE * 10];

        let result = denoiser.process(&input);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), HOP_SIZE * 10);
    }

    #[test]
    fn test_process_invalid_length() {
        let mut denoiser = Denoiser::new().unwrap();
        let input = vec![0.0f32; HOP_SIZE * 10 + 100];

        let result = denoiser.process(&input);
        assert!(result.is_err());
        match result {
            Err(Error::InvalidFrameSize { expected, actual }) => {
                assert_eq!(expected, HOP_SIZE);
                assert_eq!(actual, HOP_SIZE * 10 + 100);
            }
            _ => panic!("Expected InvalidFrameSize error"),
        }
    }
}
