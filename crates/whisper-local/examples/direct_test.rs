use whisper_rs::{WhisperContext, WhisperContextParameters};

fn main() {
    let model_path = "/home/benediktb/.local/share/com.hyprnote.dev/stt/ggml-small-q8_0.bin";

    println!("Testing direct whisper-rs initialization...");
    println!("Model path: {}", model_path);
    println!("File exists: {}", std::path::Path::new(model_path).exists());

    if let Ok(metadata) = std::fs::metadata(model_path) {
        println!("File size: {} bytes", metadata.len());
    }

    // Test with default parameters (CPU only)
    let params = WhisperContextParameters::default();
    println!("Using default parameters...");

    match WhisperContext::new_with_params(model_path, params) {
        Ok(ctx) => {
            println!("Model initialized successfully with default parameters!");
            // Try to create a state
            match ctx.create_state() {
                Ok(_state) => println!("State created successfully!"),
                Err(e) => println!("Failed to create state: {:?}", e),
            }
        },
        Err(e) => {
            println!("Failed to initialize model with default parameters: {:?}", e);

            // Try with explicit CPU settings
            let mut params = WhisperContextParameters::default();
            params.use_gpu = false;
            println!("Trying with explicit CPU settings...");

            match WhisperContext::new_with_params(model_path, params) {
                Ok(ctx) => {
                    println!("Model initialized successfully with CPU settings!");
                    // Try to create a state
                    match ctx.create_state() {
                        Ok(_state) => println!("State created successfully!"),
                        Err(e) => println!("Failed to create state: {:?}", e),
                    }
                },
                Err(e) => {
                    println!("Failed to initialize model with CPU settings: {:?}", e);
                }
            }
        }
    }
}