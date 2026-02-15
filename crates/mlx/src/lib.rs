#[cfg(target_os = "macos")]
use swift_rs::{Bool, SRObject, SRString, swift};

#[cfg(target_os = "macos")]
swift!(fn _mlx_smoke_test() -> Bool);

#[cfg(target_os = "macos")]
pub fn smoke_test() -> bool {
    unsafe { _mlx_smoke_test() }
}

#[cfg(target_os = "macos")]
swift!(fn _mlx_qwen_asr_init(model_source: &SRString) -> Bool);

#[cfg(target_os = "macos")]
swift!(fn _mlx_qwen_asr_transcribe_file(audio_path: &SRString) -> SRObject<MlxAsrResultFfi>);

#[cfg(target_os = "macos")]
#[repr(C)]
pub struct MlxAsrResultFfi {
    pub text: SRString,
    pub success: bool,
    pub error: SRString,
}

#[derive(Debug, Clone)]
pub struct AsrResult {
    pub text: String,
    pub success: bool,
    pub error: String,
}

#[cfg(target_os = "macos")]
pub fn qwen_asr_init(model_source: &str) -> bool {
    let source = SRString::from(model_source);
    unsafe { _mlx_qwen_asr_init(&source) }
}

#[cfg(not(target_os = "macos"))]
pub fn qwen_asr_init(_model_source: &str) -> bool {
    false
}

#[cfg(target_os = "macos")]
pub fn qwen_asr_transcribe_file(audio_path: &str) -> AsrResult {
    let path = SRString::from(audio_path);
    let result = unsafe { _mlx_qwen_asr_transcribe_file(&path) };
    AsrResult {
        text: result.text.to_string(),
        success: result.success,
        error: result.error.to_string(),
    }
}

#[cfg(not(target_os = "macos"))]
pub fn qwen_asr_transcribe_file(_audio_path: &str) -> AsrResult {
    AsrResult {
        text: String::new(),
        success: false,
        error: "mlx ASR is only available on macOS".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "macos")]
    #[test]
    fn test_qwen_asr_with_hypr_data_audio() {
        let home = std::env::var("HOME").expect("HOME must be set");
        let local_model_path = format!("{home}/Downloads/model.safetensors");
        assert!(
            std::path::Path::new(&local_model_path).exists(),
            "expected local model at {}",
            local_model_path
        );

        assert!(
            qwen_asr_init(&local_model_path),
            "failed to initialize qwen asr model"
        );

        let result = qwen_asr_transcribe_file(hypr_data::english_1::AUDIO_PATH);
        assert!(result.success, "asr failed: {}", result.error);
        assert!(
            !result.text.trim().is_empty(),
            "transcription output is unexpectedly empty"
        );
    }
}
