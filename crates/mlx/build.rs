fn main() {
    #[cfg(target_os = "macos")]
    {
        let out_dir = std::env::var("OUT_DIR").unwrap();

        swift_rs::SwiftLinker::new("15.0")
            .with_package("hypr-mlx-swift", "./swift-lib/")
            .link();
        println!("cargo:rustc-link-lib=c++");

        let swift_path = std::process::Command::new("xcrun")
            .args(["--toolchain", "default", "--find", "swift"])
            .output()
            .expect("failed to run xcrun");
        let swift_bin = String::from_utf8_lossy(&swift_path.stdout)
            .trim()
            .to_string();
        let swift_bin_path = std::path::Path::new(&swift_bin);
        if let Some(usr) = swift_bin_path.parent().and_then(|b| b.parent()) {
            let lib_dir = usr.join("lib");
            if let Ok(entries) = std::fs::read_dir(&lib_dir) {
                for entry in entries.flatten() {
                    let name = entry.file_name();
                    let name = name.to_string_lossy();
                    if name.starts_with("swift-") {
                        let compat_dir = entry.path().join("macosx");
                        if compat_dir.exists() {
                            println!("cargo:rustc-link-search=native={}", compat_dir.display());
                            println!("cargo:rustc-link-arg=-Wl,-rpath,{}", compat_dir.display());
                        }
                    }
                }
            }
        }

        compile_metal_shaders(&out_dir);
    }

    #[cfg(not(target_os = "macos"))]
    {
        println!("cargo:warning=Swift linking is only available on macOS");
    }
}

#[cfg(target_os = "macos")]
fn compile_metal_shaders(out_dir: &str) {
    use std::path::{Path, PathBuf};
    use std::process::Command;

    let swift_build_dir = Path::new(out_dir).join("swift-rs/hypr-mlx-swift");
    let metal_dir = swift_build_dir.join("checkouts/mlx-swift/Source/Cmlx/mlx-generated/metal");

    if !metal_dir.exists() {
        println!("cargo:warning=Metal shaders directory not found, skipping metallib build");
        return;
    }

    let metal_compiler = PathBuf::from(
        "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/metal",
    );
    let metallib_tool = PathBuf::from(
        "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/metallib",
    );

    if !metal_compiler.exists() || !metallib_tool.exists() {
        println!("cargo:warning=Metal compiler not found, skipping metallib build");
        return;
    }

    let air_dir = Path::new(out_dir).join("metal-air");
    std::fs::create_dir_all(&air_dir).expect("failed to create air dir");

    let mut air_files = Vec::new();
    collect_metal_files(
        &metal_dir,
        &mut air_files,
        &metal_compiler,
        &metal_dir,
        &air_dir,
    );

    if air_files.is_empty() {
        println!("cargo:warning=No .metal files found");
        return;
    }

    let metallib_path = Path::new(out_dir).join("mlx.metallib");
    let mut cmd = Command::new(&metallib_tool);
    for air in &air_files {
        cmd.arg(air);
    }
    cmd.arg("-o").arg(&metallib_path);
    let status = cmd.status().expect("failed to run metallib");
    assert!(status.success(), "metallib linking failed");

    // Copy to target dir so the binary can find it at runtime
    if let Ok(target_dir) = find_target_deps_dir(out_dir) {
        let dest = target_dir.join("mlx.metallib");
        std::fs::copy(&metallib_path, &dest).ok();
    }
}

#[cfg(target_os = "macos")]
fn collect_metal_files(
    dir: &std::path::Path,
    air_files: &mut Vec<std::path::PathBuf>,
    metal_compiler: &std::path::Path,
    include_dir: &std::path::Path,
    air_dir: &std::path::Path,
) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_metal_files(&path, air_files, metal_compiler, include_dir, air_dir);
        } else if path.extension().is_some_and(|e| e == "metal") {
            let stem = path
                .strip_prefix(include_dir)
                .unwrap_or(&path)
                .to_string_lossy()
                .replace('/', "_")
                .replace(".metal", ".air");
            let air_path = air_dir.join(&stem);

            let status = std::process::Command::new(metal_compiler)
                .args(["-std=metal3.1", "-w"])
                .arg(format!("-I{}", include_dir.display()))
                .arg("-c")
                .arg(&path)
                .arg("-o")
                .arg(&air_path)
                .status()
                .expect("failed to run metal compiler");

            if status.success() {
                air_files.push(air_path);
            } else {
                println!("cargo:warning=Failed to compile {}", path.display());
            }
        }
    }
}

#[cfg(target_os = "macos")]
fn find_target_deps_dir(out_dir: &str) -> Result<std::path::PathBuf, ()> {
    let out = std::path::Path::new(out_dir);
    let target_profile = out
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .ok_or(())?;
    let deps = target_profile.join("deps");
    if deps.exists() { Ok(deps) } else { Err(()) }
}
