fn main() {
    #[cfg(target_os = "macos")]
    {
        // Only run Swift build on macOS
        swift_rs::SwiftLinker::new("14.2")
            .with_package("swift-lib", "./swift-lib/")
            .link();
    }
}
