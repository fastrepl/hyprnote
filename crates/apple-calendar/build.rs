fn main() {
    // Ensure the same minimum supported macOS version is specified as in your `Package.swift` file.
    swift_rs::SwiftLinker::new("11")
        .with_package("swift-lib", "./swift-lib/")
        .link();
}
