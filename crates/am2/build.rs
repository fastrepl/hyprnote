fn main() {
    #[cfg(target_os = "macos")]
    {
        swift_rs::SwiftLinker::new("13.0")
            .with_package("am2-swift", "./swift-lib/")
            .with_framework("ArgmaxSDK")
            .link();
    }
}
