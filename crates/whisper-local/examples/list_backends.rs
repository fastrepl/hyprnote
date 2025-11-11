use whisper_local::list_ggml_backends;

/// Lists available GGML backends and prints their kind, name, description, and memory stats.
///
/// # Examples
///
/// ```
/// // Run the example binary to print detected backends to stdout.
/// fn main() {
///     let backends = whisper_local::list_ggml_backends();
///     println!("Available backends:");
///     for backend in backends {
///         println!("  {}: {} - {} ({} MB free / {} MB total)",
///                  backend.kind, backend.name, backend.description,
///                  backend.free_memory_mb, backend.total_memory_mb);
///     }
/// }
/// ```
fn main() {
    let backends = list_ggml_backends();
    println!("Available backends:");
    for backend in backends {
        println!(
            "  {}: {} - {} ({} MB free / {} MB total)",
            backend.kind,
            backend.name,
            backend.description,
            backend.free_memory_mb,
            backend.total_memory_mb
        );
    }
}
