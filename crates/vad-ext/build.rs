fn main() {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    swift_rs::link_swift_framework("vvad");
}
