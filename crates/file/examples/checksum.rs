use file::calculate_file_checksum;
use std::path::Path;

/// Example program that computes and prints the checksum of a model file.
///
/// Prints diagnostic information (path, existence, optional size) and the computed checksum
/// for the hard-coded model path used by the example.
///
/// # Examples
///
/// ```no_run
/// // Running the example program will print the path, existence, optional size, and checksum.
/// // The example uses a hard-coded model path and is not run as part of doctests.
/// fn main() {
///     crate::main();
/// }
/// ```
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