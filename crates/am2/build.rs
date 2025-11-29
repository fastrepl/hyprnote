fn main() {
    #[cfg(target_os = "macos")]
    {
        use std::path::Path;
        use std::process::Command;

        let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
        let swift_lib_path = manifest_dir.join("swift-lib");
        let frameworks_dir = swift_lib_path.join("frameworks");
        let xcframework_dest = frameworks_dir.join("ArgmaxSDK.xcframework");

        if !xcframework_dest.exists() {
            println!("cargo:warning=ArgmaxSDK.xcframework not found, extracting from registry...");

            let temp_dir = manifest_dir.join("temp-resolver");
            std::fs::create_dir_all(&temp_dir).expect("Failed to create temp directory");

            let resolver_package = r#"// swift-tools-version:5.10
import PackageDescription
let package = Package(
  name: "resolver",
  platforms: [.macOS(.v13)],
  dependencies: [
    .package(id: "argmaxinc.argmax-sdk-swift", exact: "1.9.3")
  ],
  targets: []
)
"#;
            std::fs::write(temp_dir.join("Package.swift"), resolver_package)
                .expect("Failed to write resolver Package.swift");

            let status = Command::new("swift")
                .args(["package", "resolve"])
                .current_dir(&temp_dir)
                .status()
                .expect("Failed to run swift package resolve");

            if !status.success() {
                panic!("swift package resolve failed");
            }

            let artifacts_path = temp_dir.join(
                ".build/artifacts/argmaxinc.argmax-sdk-swift/ArgmaxSDK/ArgmaxSDK.xcframework",
            );

            if !artifacts_path.exists() {
                panic!(
                    "ArgmaxSDK.xcframework not found in artifacts at: {:?}",
                    artifacts_path
                );
            }

            std::fs::create_dir_all(&frameworks_dir)
                .expect("Failed to create frameworks directory");

            let status = Command::new("cp")
                .args([
                    "-R",
                    artifacts_path.to_str().unwrap(),
                    xcframework_dest.to_str().unwrap(),
                ])
                .status()
                .expect("Failed to copy xcframework");

            if !status.success() {
                panic!("Failed to copy ArgmaxSDK.xcframework");
            }

            std::fs::remove_dir_all(&temp_dir).ok();

            println!("cargo:warning=ArgmaxSDK.xcframework extracted successfully");
        }

        let out_dir = std::env::var("OUT_DIR").unwrap();
        let swift_build_dir = Path::new(&out_dir).join("swift-rs/swift-lib");
        let workspace_state = swift_build_dir.join("workspace-state.json");
        if workspace_state.exists() {
            std::fs::remove_file(&workspace_state).ok();
        }

        swift_rs::SwiftLinker::new("13.0")
            .with_package("swift-lib", "./swift-lib/")
            .link();

        let framework_path = xcframework_dest.join("macos-arm64");
        println!(
            "cargo:rustc-link-search=framework={}",
            framework_path.display()
        );
        println!("cargo:rustc-link-lib=framework=ArgmaxSDK");
        println!(
            "cargo:rustc-link-arg=-Wl,-rpath,{}",
            framework_path.display()
        );
    }

    #[cfg(not(target_os = "macos"))]
    {
        println!("cargo:warning=Swift linking is only available on macOS");
    }
}
