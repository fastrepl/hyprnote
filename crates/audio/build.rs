fn main() {
    #[cfg(target_os = "windows")]
    {
        // Windows 오디오 API 링크 - 필수적인 것들만
        println!("cargo:rustc-link-lib=ole32");
        println!("cargo:rustc-link-lib=oleaut32");
        println!("cargo:rustc-link-lib=avrt");
    }
}
