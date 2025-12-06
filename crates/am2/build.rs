fn main() {
    #[cfg(target_os = "macos")]
    {
        use std::env;
        use std::path::Path;
        use std::process::Command;

        let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
        let out_dir = env::var("OUT_DIR").unwrap();
        let debug = env::var("DEBUG").unwrap() == "true";
        let configuration = if debug { "debug" } else { "release" };

        let package_path = Path::new(&manifest_dir).join("swift-lib");
        let build_path = Path::new(&out_dir).join("swift-rs").join("swift-lib");

        let sdk_output = Command::new("xcrun")
            .args(["--sdk", "macosx", "--show-sdk-path"])
            .output()
            .expect("Failed to get SDK path");
        let sdk_path = String::from_utf8_lossy(&sdk_output.stdout);
        let sdk_path = sdk_path.trim();

        let arch = match std::env::consts::ARCH {
            "aarch64" => "arm64",
            arch => arch,
        };

        let swift_target = format!("{}-apple-macosx13.0", arch);
        let framework_search_path = build_path
            .join(format!("{}-apple-macosx", arch))
            .join(configuration);

        let status = Command::new("swift")
            .current_dir(&package_path)
            .arg("build")
            .args(["--sdk", sdk_path])
            .args(["-c", configuration])
            .args(["--arch", arch])
            .args(["--build-path", &build_path.display().to_string()])
            .args(["-Xswiftc", "-sdk", "-Xswiftc", sdk_path])
            .args(["-Xswiftc", "-target", "-Xswiftc", &swift_target])
            .args(["-Xcc", &format!("--target={swift_target}")])
            .args(["-Xcxx", &format!("--target={swift_target}")])
            .args([
                "-Xswiftc",
                "-F",
                "-Xswiftc",
                &framework_search_path.display().to_string(),
            ])
            .status()
            .expect("Failed to run swift build");

        if !status.success() {
            panic!("Failed to compile swift package swift-lib");
        }

        let toolchain_path = "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/macosx";
        let clang_base = "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/clang";

        println!("cargo:rustc-link-search=native={toolchain_path}");
        println!("cargo:rustc-link-search=native=/usr/lib/swift");
        println!("cargo:rustc-link-lib=clang_rt.osx");

        if let Ok(entries) = std::fs::read_dir(clang_base) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let darwin_path = path.join("lib/darwin");
                    if darwin_path.exists() {
                        println!("cargo:rustc-link-search={}", darwin_path.display());
                        break;
                    }
                }
            }
        }

        println!("cargo:rerun-if-changed={}", package_path.display());
        println!(
            "cargo:rustc-link-search=native={}",
            framework_search_path.display()
        );
        println!("cargo:rustc-link-lib=static=swift-lib");
    }

    #[cfg(not(target_os = "macos"))]
    {
        println!("cargo:warning=Swift linking is only available on macOS");
    }
}
