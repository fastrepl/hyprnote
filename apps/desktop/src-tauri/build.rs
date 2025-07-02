use std::{env, process::Command};

fn main() {
    setup();
    tauri_build::build()
}

fn export(key: &str, val: &str) {
    println!("cargo::rustc-env={key}={val}");
    println!("cargo::rerun-if-env-changed={key}");
}

fn setup() {
    let target = env::var("TARGET").unwrap_or_default();
    if !target.contains("windows-msvc") {
        return;
    }

    let is_debug = env::var("PROFILE").map_or(false, |p| p == "debug")
        || env::var("DEBUG").map_or(false, |d| d == "1");

    if is_debug {
        // ═══════════════════════════════════════════════════════════════
        // 🔥 성공했던 config.toml의 모든 설정을 build.rs로 이식
        // ═══════════════════════════════════════════════════════════════

        // ── 기본 컴파일러 설정 ──
        export("CC_x86_64-pc-windows-msvc", "cl");
        export("CXX_x86_64-pc-windows-msvc", "cl");

        // ── 전역 CFLAGS (여러 버전 모두 설정) ──
        export("CFLAGS", "/MDd /D_DEBUG /Od");
        export("CXXFLAGS", "/MDd /D_DEBUG /Od");

        // 타겟별 플래그 (하이픈 버전)
        export("CFLAGS_x86_64-pc-windows-msvc", "/MDd /D_DEBUG /Od");
        export("CXXFLAGS_x86_64-pc-windows-msvc", "/MDd /D_DEBUG /Od");

        // 타겟별 플래그 (언더스코어 버전) - 이게 핵심일 수 있음!
        export("CFLAGS_x86_64_pc_windows_msvc", "/MDd /D_DEBUG /Od");
        export("CXXFLAGS_x86_64_pc_windows_msvc", "/MDd /D_DEBUG /Od");

        // TARGET_ 접두사 버전
        export("TARGET_CFLAGS", "/MDd /D_DEBUG /Od");
        export("TARGET_CXXFLAGS", "/MDd /D_DEBUG /Od");

        // ── CMAKE 강제 설정 (llama.cpp 등이 사용) ──
        export("CMAKE_CXX_FLAGS", "/MDd /D_DEBUG");
        export("CMAKE_C_FLAGS", "/MDd /D_DEBUG");
        export("CMAKE_CXX_FLAGS_DEBUG", "/MDd /D_DEBUG /Od /Zi");
        export("CMAKE_C_FLAGS_DEBUG", "/MDd /D_DEBUG /Od /Zi");
        export("CMAKE_CXX_FLAGS_RELEASE", "/MDd /D_DEBUG /O2"); // 릴리스도 디버그 CRT
        export("CMAKE_C_FLAGS_RELEASE", "/MDd /D_DEBUG /O2");
        export("CMAKE_MSVC_RUNTIME_LIBRARY", "MultiThreadedDebugDLL");
        export("CMAKE_BUILD_TYPE", "Debug");

        // ── 전역 디버그 강제 플래그 ──
        export("DEBUG", "1");
        export("NDEBUG", "");
        export("_DEBUG", "1");
        export("MSVC_RUNTIME", "dynamic-debug");
        export("MSVC_DEBUG", "1");

        // ── 특정 라이브러리 강제 설정 ──
        export("WHISPER_CFLAGS", "/MDd /D_DEBUG");
        export("WHISPER_CXXFLAGS", "/MDd /D_DEBUG");

        // ── Rust 링커 설정 ──
        println!("cargo::rustc-link-arg=/NODEFAULTLIB:msvcrt");
        println!("cargo::rustc-link-arg=/DEFAULTLIB:msvcrtd");
        println!("cargo::rustc-link-arg=/NODEFAULTLIB:msvcprt");
        println!("cargo::rustc-link-arg=/DEFAULTLIB:msvcprtd");

        println!("cargo:warning=🟢 building with /MDd (debug CRT) - ALL FORCED");
    } else {
        // ── 릴리스 빌드: /MD + msvcrt ──────────────────────────────────
        export("CFLAGS", "/MD /DNDEBUG /O2");
        export("CXXFLAGS", "/MD /DNDEBUG /O2");

        export("CMAKE_MSVC_RUNTIME_LIBRARY", "MultiThreadedDLL");
        export("CMAKE_BUILD_TYPE", "Release");

        // 혹시 끌려올 수도 있는 디버그 CRT를 제거
        println!("cargo::rustc-link-arg=/NODEFAULTLIB:msvcrtd");
        println!("cargo::rustc-link-arg=/NODEFAULTLIB:msvcprtd");

        println!("cargo::warning=🔵 building with /MD (release CRT)");
    }

    // ------------------------------------------------------------------
    // ❺ C/C++ 코드를 직접 컴파일한다면 cc::Build 사용
    // (예시는 생략. 필요한 경우 is_debug로 /MDd·/MD 플래그 분기)
    // ------------------------------------------------------------------

    // 'src/native/**/*' 변경되면 재빌드 등 필요 시 추가
    // println!("cargo:rerun-if-changed=src/native/foo.c");
}
