# Linux Install Notes

## Recent Updates (November 2025)

The Linux support has been significantly improved with comprehensive error handling and robustness enhancements:
- **Audio System:** Enhanced error handling eliminates 100+ potential crash points
- **Device Management:** Improved microphone detection and fallback handling  
- **Browser Detection:** More robust system integration with graceful error handling
- **Build Stability:** Heavy ML dependencies (`local-llm`, `local-stt`) are now opt-in to reduce build complexity

## Install

My (work in progress) notes about installation on linux.

For some information see *CONTRIBUTING.md*.

``` bash
# Installing the rust toolchain used for tauri and the backend libs
curl https://sh.rustup.rs -sSf | sh

# system dependencies for tauri
sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchel libclang-dev libxss-dev

# for sound
sudo apt install libasound2-dev

# for machine learning components
sudo apt install cmake libopenblas-dev

git clone https://github.com/fastrepl/hyprnote.git
cd hyprnote


# access the X Window System display without authentication
xhost +SI:localuser:$USER

# add virtual echo-cancel source to allow shared access
pactl load-module module-echo-cancel

# prepare build
pnpm install

# build and start development (basic features)
turbo -F @hypr/desktop tauri:dev

# OR: build with optional ML features (requires more dependencies)
turbo -F @hypr/desktop tauri:dev --features local-llm,local-stt
```
