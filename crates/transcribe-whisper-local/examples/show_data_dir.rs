use std::path::PathBuf;

/// Displays the user data directory, the constructed model file path under
/// "com.hyprnote.dev/stt/ggml-small-q8_0.bin", whether that model file exists,
/// and the file size in bytes when it does.
///
/// # Examples
///
/// ```
/// // Run the example program which prints the data directory, model path,
/// // existence, and size (if present).
/// main();
/// ```
fn main() {
    let model_path = dirs::data_dir()
        .unwrap()
        .join("com.hyprnote.dev")
        .join("stt/ggml-small-q8_0.bin");

    println!("Data dir: {:?}", dirs::data_dir());
    println!("Model path: {:?}", model_path);
    println!("Model file exists: {}", model_path.exists());

    if model_path.exists() {
        let metadata = std::fs::metadata(&model_path).unwrap();
        println!("File size: {} bytes", metadata.len());
    }
}