#!/usr/bin/env python3

# https://github.com/thewh1teagle/vibe/blob/9ffde8a/scripts/pre_build.js

import os
import sys
import json
import subprocess
import urllib.request
import shutil
import platform
from pathlib import Path


config = {
    "vulkan_runtime_real_name": "vulkan_runtime",
    "vulkan_sdk_real_name": "vulkan_sdk",
    "windows": {
        "vulkan_runtime_name": "VulkanRT-1.3.290.0-Components",
        "vulkan_runtime_url": "https://sdk.lunarg.com/sdk/download/1.3.290.0/windows/VulkanRT-1.3.290.0-Components.zip",
        "vulkan_sdk_name": "VulkanSDK-1.3.290.0-Installer",
        "vulkan_sdk_url": "https://sdk.lunarg.com/sdk/download/1.3.290.0/windows/VulkanSDK-1.3.290.0-Installer.exe",
    },
}


class JsonMidifier:
    def __init__(self, path: str):
        self.path = path
        self.content = {}

    def __enter__(self) -> "JsonMidifier":
        with open(self.path, "r") as f:
            self.content = json.load(f)
        return self

    def __exit__(self, exc_type: type, exc_value: Exception, traceback: object):
        with open(self.path, "w") as f:
            json.dump(self.content, f, indent=4)


def is_windows():
    return platform.system() == "Windows"


def is_macos():
    return platform.system() == "Darwin"


def has_feature(name: str) -> bool:
    return f"--{name}" in sys.argv or name in sys.argv


def download_file(url, path):
    print(f"Downloading {url} to {path}")
    urllib.request.urlretrieve(url, path)


def setup_vulkan():
    if is_windows():
        vulkan_sdk_path = Path(config["vulkan_sdk_real_name"])
        if not vulkan_sdk_path.exists():
            vulkan_sdk_installer = f"{config['windows']['vulkan_sdk_name']}.exe"
            download_file(config["windows"]["vulkan_sdk_url"], vulkan_sdk_installer)

            vulkan_sdk_root = Path.cwd() / config["vulkan_sdk_real_name"]
            run_cmd(
                [
                    vulkan_sdk_installer,
                    "--root",
                    str(vulkan_sdk_root),
                    "--accept-licenses",
                    "--default-answer",
                    "--confirm-command",
                    "install",
                    "copy_only=1",
                ]
            )

            vulkan_runtime_zip = f"{config['windows']['vulkan_runtime_name']}.zip"
            download_file(config["windows"]["vulkan_runtime_url"], vulkan_runtime_zip)
            run_cmd([r"C:\Program Files\7-Zip\7z.exe", "x", vulkan_runtime_zip])
            shutil.move(
                config["windows"]["vulkan_runtime_name"],
                config["vulkan_runtime_real_name"],
            )
            os.remove(vulkan_sdk_installer)
            os.remove(vulkan_runtime_zip)

        with JsonMidifier("./tauri.windows.conf.json") as tauri:
            if "bundle" not in tauri.content:
                tauri.content["bundle"] = {}
            if "resources" not in tauri.content["bundle"]:
                tauri.content["bundle"]["resources"] = {}

            tauri.content["bundle"]["resources"]["vulkan_runtime\\x64\\*.dll"] = "./"


def run_cmd(args):
    subprocess.run(args, check=True, capture_output=True, text=True)


def main():
    script_dir = Path(__file__).parent
    tauri_dir = script_dir.parent / "apps" / "desktop" / "src-tauri"
    os.chdir(tauri_dir)
    print(f"chdir: '{tauri_dir}'")

    with JsonMidifier("./tauri.conf.json") as tauri:
        if "bundle" not in tauri.content:
            tauri.content["bundle"] = {}
        if "resources" not in tauri.content["bundle"]:
            tauri.content["bundle"]["resources"] = {}

        tauri.content["bundle"]["resources"]["vulkan_runtime\\x64\\*.dll"] = "./"

    if has_feature("vulkan"):
        setup_vulkan()


if __name__ == "__main__":
    main()
