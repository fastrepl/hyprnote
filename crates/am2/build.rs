fn main() {
    // Build skipped - uncomment below to re-enable Swift linking

    // #[cfg(target_os = "macos")]
    // {
    //     swift_rs::SwiftLinker::new("13.0")
    //         .with_package("swift-lib", "./swift-lib/")
    //         .link();
    // }
    //
    // #[cfg(not(target_os = "macos"))]
    // {
    //     println!("cargo:warning=Swift linking is only available on macOS");
    // }
}
