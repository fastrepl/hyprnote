# https://github.com/thewh1teagle/vibe/blob/9ffde8a/scripts/pre_build.js

import os
import sys
import json
import subprocess
import urllib.request
import shutil
import platform
from pathlib import Path

# BLAS
# https://github.com/utilityai/llama-cpp-rs/blob/2f433cd/llama-cpp-sys-2/build.rs#L279-L281

# OPENMP
# Can cause `the code execution cannot proceed because VCOMP140.DLL was not found` error on Windows


CONFIG = {
    "openblas_realname": "openblas",
    "vulkan_runtime_real_name": "vulkan_runtime",
    "vulkan_sdk_real_name": "vulkan_sdk",
    "windows": {
        "openblas_name": "OpenBLAS-0.3.26-x64",
        "openblas_url": "https://github.com/OpenMathLib/OpenBLAS/releases/download/v0.3.26/OpenBLAS-0.3.26-x64.zip",
        "vulkan_runtime_name": "VulkanRT-1.3.290.0-Components",
        "vulkan_runtime_url": "https://sdk.lunarg.com/sdk/download/1.3.290.0/windows/VulkanRT-1.3.290.0-Components.zip",
        "vulkan_sdk_name": "VulkanSDK-1.3.290.0-Installer",
        "vulkan_sdk_url": "https://sdk.lunarg.com/sdk/download/1.3.290.0/windows/VulkanSDK-1.3.290.0-Installer.exe",
        "vcpkg_packages": [],
    },
}


script_dir = Path(__file__).parent
tauri_dir = script_dir.parent / "apps" / "desktop" / "src-tauri"
os.chdir(tauri_dir)


cwd = Path.cwd()


def is_windows():
    return platform.system() == "Windows"


def is_linux():
    return platform.system() == "Linux"


def is_macos():
    return platform.system() == "Darwin"


def has_feature(name: str) -> bool:
    return f"--{name}" in sys.argv or name in sys.argv


def run_command(cmd: str, quiet: bool = False) -> subprocess.CompletedProcess:
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=quiet, text=True, check=False
        )

        if result.returncode != 0 and not quiet:
            print(f"Command failed: {cmd}")
            if result.stderr:
                print(f"Error: {result.stderr}")

        return result
    except Exception as e:
        print(f"Error running command '{cmd}': {e}")
        raise


def wget(url: str, file_path: str):
    """Download a file using urllib"""
    try:
        print(f"Downloading: {file_path}")
        urllib.request.urlretrieve(url, file_path)
        print(f"Downloaded: {file_path}")
    except Exception as e:
        raise Exception(f"Failed to download {url}: {e}")


def setup_windows():
    openblas_path = cwd / CONFIG["openblas_realname"]
    if not openblas_path.exists() and has_feature("openblas"):
        openblas_archive = f"{CONFIG['windows']['openblas_name']}.zip"
        wget(CONFIG["windows"]["openblas_url"], openblas_archive)
        run_command(
            f'"C:\\Program Files\\7-Zip\\7z.exe" x {openblas_archive} -o{CONFIG["openblas_realname"]}'
        )
        os.remove(openblas_archive)

        # Copy include to lib
        include_src = openblas_path / "include"
        lib_dst = openblas_path / "lib"
        if include_src.exists():
            shutil.copytree(str(include_src), str(lib_dst), dirs_exist_ok=True)

        # Copy libopenblas.lib to openblas.lib
        libopenblas = lib_dst / "libopenblas.lib"
        openblas_lib = lib_dst / "openblas.lib"
        if libopenblas.exists():
            shutil.copy2(str(libopenblas), str(openblas_lib))

    # Setup Vulkan
    vulkan_sdk_path = cwd / CONFIG["vulkan_sdk_real_name"]
    if not vulkan_sdk_path.exists() and has_feature("vulkan"):
        # Download and install Vulkan SDK
        vulkan_sdk_exe = f"{CONFIG['windows']['vulkan_sdk_name']}.exe"
        wget(CONFIG["windows"]["vulkan_sdk_url"], vulkan_sdk_exe)

        executable = cwd / vulkan_sdk_exe
        vulkan_sdk_root = cwd / CONFIG["vulkan_sdk_real_name"]
        run_command(
            f'{executable} --root "{vulkan_sdk_root}" --accept-licenses --default-answer --confirm-command install copy_only=1'
        )

        # Download and extract Vulkan Runtime
        vulkan_runtime_archive = f"{CONFIG['windows']['vulkan_runtime_name']}.zip"
        wget(CONFIG["windows"]["vulkan_runtime_url"], vulkan_runtime_archive)
        run_command(f'"C:\\Program Files\\7-Zip\\7z.exe" x {vulkan_runtime_archive}')
        shutil.move(
            CONFIG["windows"]["vulkan_runtime_name"], CONFIG["vulkan_runtime_real_name"]
        )

        # Cleanup
        os.remove(vulkan_sdk_exe)
        os.remove(vulkan_runtime_archive)

    # Setup vcpkg packages
    if CONFIG["windows"]["vcpkg_packages"]:
        packages = " ".join(CONFIG["windows"]["vcpkg_packages"])
        run_command(f"C:\\vcpkg\\vcpkg.exe install {packages}", quiet=True)


def setup_openblas():
    if not has_feature("openblas"):
        return

    if is_windows():
        config_file = cwd / "tauri.windows.conf.json"
        if config_file.exists():
            with open(config_file, "r") as f:
                tauri_config = json.load(f)

            resources = tauri_config.setdefault("bundle", {}).setdefault(
                "resources", {}
            )
            resources["openblas\\bin\\*.dll"] = "./"

            with open(config_file, "w") as f:
                json.dump(tauri_config, f, indent=4)


def setup_vulkan():
    if not has_feature("vulkan"):
        return

    vulkan_path = cwd / CONFIG["vulkan_sdk_real_name"]
    vulkan_runtime_path = cwd / CONFIG["vulkan_runtime_real_name"]

    if is_windows():
        config_file = cwd / "tauri.windows.conf.json"
        if config_file.exists():
            with open(config_file, "r") as f:
                tauri_config = json.load(f)

            resources = tauri_config.setdefault("bundle", {}).setdefault(
                "resources", {}
            )
            resources["vulkan_runtime\\x64\\*.dll"] = "./"

            with open(config_file, "w") as f:
                json.dump(tauri_config, f, indent=4)


def main():
    if is_windows():
        setup_windows()
        setup_vulkan()


if __name__ == "__main__":
    main()
