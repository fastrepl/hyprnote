fn main() {
    // Override whisper.cpp build with conservative CPU flags
    println!("cargo:rustc-env=WHISPER_DONT_GENERATE_BINDINGS=1");
    
    // Set conservative CPU target for whisper.cpp
    // std::env::set_var("CXXFLAGS", "-march=x86-64 -mtune=generic -mno-avx2 -mno-fma");
    // std::env::set_var("CFLAGS", "-march=x86-64 -mtune=generic -mno-avx2 -mno-fma");
    
    // Disable native CPU optimization
    std::env::set_var("WHISPER_NO_AVX", "1");
    std::env::set_var("WHISPER_NO_AVX2", "1");
    std::env::set_var("WHISPER_NO_FMA", "1");
}
