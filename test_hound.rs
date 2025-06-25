use hound::{WavSpec, WavWriter, SampleFormat};
use std::path::Path;

fn main() {
    println!("Testing hound WavWriter::append() functionality...");
    
    // Test configuration
    let test_dir = std::env::temp_dir().join("hound_test");
    let test_file = test_dir.join("test_audio.wav");
    
    // Create test directory
    if let Err(e) = std::fs::create_dir_all(&test_dir) {
        println!("Failed to create test directory: {}", e);
        return;
    }
    
    println!("Test directory: {:?}", test_dir);
    println!("Test file: {:?}", test_file);
    
    // WAV specification
    let wav_spec = WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };
    
    // Test 1: Create new WAV file
    println!("\n=== Test 1: Creating new WAV file ===");
    match test_create_wav(&test_file, &wav_spec) {
        Ok(_) => println!("✓ Successfully created WAV file"),
        Err(e) => {
            println!("✗ Failed to create WAV file: {}", e);
            return;
        }
    }
    
    // Test 2: Check file size after creation
    if let Ok(metadata) = std::fs::metadata(&test_file) {
        println!("File size after creation: {} bytes", metadata.len());
    }
    
    // Test 3: Append to existing WAV file
    println!("\n=== Test 2: Appending to existing WAV file ===");
    match test_append_wav(&test_file) {
        Ok(_) => println!("✓ Successfully appended to WAV file"),
        Err(e) => {
            println!("✗ Failed to append to WAV file: {}", e);
            println!("This is likely where the Windows C runtime error occurs!");
        }
    }
    
    // Test 4: Check file size after append
    if let Ok(metadata) = std::fs::metadata(&test_file) {
        println!("File size after append: {} bytes", metadata.len());
    }
    
    // Test 5: Try append multiple times
    println!("\n=== Test 3: Multiple appends ===");
    for i in 1..=3 {
        println!("Append attempt #{}", i);
        match test_append_wav(&test_file) {
            Ok(_) => println!("✓ Append #{} successful", i),
            Err(e) => {
                println!("✗ Append #{} failed: {}", i, e);
                break;
            }
        }
    }
    
    // Test 6: Try appending to empty file
    println!("\n=== Test 4: Appending to empty file ===");
    let empty_file = test_dir.join("empty.wav");
    
    // Create empty file
    if let Err(e) = std::fs::File::create(&empty_file) {
        println!("Failed to create empty file: {}", e);
    } else {
        println!("Created empty file: {:?}", empty_file);
        match test_append_wav(&empty_file) {
            Ok(_) => println!("✓ Successfully appended to empty file"),
            Err(e) => {
                println!("✗ Failed to append to empty file: {}", e);
                println!("This might be the root cause - appending to invalid/empty WAV!");
            }
        }
    }
    
    // Cleanup
    println!("\n=== Cleanup ===");
    if let Err(e) = std::fs::remove_dir_all(&test_dir) {
        println!("Failed to cleanup test directory: {}", e);
    } else {
        println!("✓ Cleaned up test files");
    }
}

fn test_create_wav(path: &Path, spec: &WavSpec) -> Result<(), Box<dyn std::error::Error>> {
    println!("Creating WAV file at: {:?}", path);
    
    let mut writer = WavWriter::create(path, *spec)?;
    
    // Write some test samples
    let samples: Vec<i16> = (0..1000).map(|i| (i as f32 * 0.1).sin() as i16 * 1000).collect();
    
    for sample in samples {
        writer.write_sample(sample)?;
    }
    
    writer.finalize()?;
    println!("WAV file created and finalized");
    
    Ok(())
}

fn test_append_wav(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    println!("Attempting to append to: {:?}", path);
    
    // Check if file exists and get its size
    if !path.exists() {
        return Err("File does not exist".into());
    }
    
    let file_size = std::fs::metadata(path)?.len();
    println!("File exists, size: {} bytes", file_size);
    
    // This is the critical line that might cause the Windows C runtime error
    println!("Calling hound::WavWriter::append()...");
    let mut writer = WavWriter::append(path)?;
    println!("✓ WavWriter::append() succeeded");
    
    // Write some additional samples
    let samples: Vec<i16> = (0..500).map(|i| (i as f32 * 0.2).cos() as i16 * 800).collect();
    
    println!("Writing {} samples...", samples.len());
    for sample in samples {
        writer.write_sample(sample)?;
    }
    
    println!("Finalizing writer...");
    writer.finalize()?;
    println!("✓ Writer finalized successfully");
    
    Ok(())
} 