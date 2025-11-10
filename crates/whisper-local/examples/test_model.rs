use whisper_local::Whisper;
use std::path::PathBuf;

/// Demonstrates initializing a local Whisper model from a filesystem path and prints basic diagnostics.
///
/// Prints the model path, whether the file exists, the file size if available, and constructs a `Whisper` instance.
///
/// # Examples
///
/// ```no_run
/// // Adjust the hardcoded path in the example file to point to a valid model on your system before running.
/// crate::main();
/// ```
fn main() {
    let model_path = PathBuf::from("/home/benediktb/.local/share/com.hyprnote.dev/stt/ggml-small-q8_0.bin");

    println!("Testing model initialization...");
    println!("Model path: {:?}", model_path);
    println!("File exists: {}", model_path.exists());

    if let Ok(metadata) = std::fs::metadata(&model_path) {
        println!("File size: {} bytes", metadata.len());
    }

    // Test with CPU only
    let whisper = Whisper::builder()
        .model_path(model_path.to_str().unwrap())
        .build();

    println!("Model initialized successfully!");
}