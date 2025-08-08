use std::path::PathBuf;

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