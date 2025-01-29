fn main() {
    swift_rs::SwiftLinker::new("14.2")
        .with_package("swift-lib", "./swift-lib/")
        .link();
}
