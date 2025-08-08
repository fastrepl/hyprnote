use file::calculate_file_checksum;
use std::path::Path;

fn main() {
    let model_path = Path::new("/home/benediktb/.local/share/com.hyprnote.dev/stt/ggml-small-q8_0.bin");

    println!("Calculating checksum for: {:?}", model_path);
    println!("File exists: {}", model_path.exists());

    if let Ok(metadata) = std::fs::metadata(model_path) {
        println!("File size: {} bytes", metadata.len());
    }

    match calculate_file_checksum(model_path) {
        Ok(checksum) => println!("Checksum: {}", checksum),
        Err(e) => println!("Error calculating checksum: {:?}", e),
    }
}