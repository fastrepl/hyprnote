fn main() {
    // swift-rs has a minimum of macOS 10.13
    // Ensure the same minimum supported macOS version is specified as in your `Package.swift` file.
    swift_rs::SwiftLinker::new("14")
        .with_package("swift-lib", "./swift-lib/")
        .link();
}
