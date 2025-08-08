use whisper_local::list_ggml_backends;

fn main() {
    let backends = list_ggml_backends();
    println!("Available backends:");
    for backend in backends {
        println!("  {}: {} - {} ({} MB free / {} MB total)",
                 backend.kind, backend.name, backend.description,
                 backend.free_memory_mb, backend.total_memory_mb);
    }
}