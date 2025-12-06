fn main() {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    swift_rs::propagate_framework_rpath("vvad", false);
}
