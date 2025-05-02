## Reporting Issues

### What version of Hyprnote are you using?

```bash
curl -s https://raw.githubusercontent.com/fastrepl/hyprnote/refs/heads/main/scripts/info.sh | bash
```

Running above script will output something like the following:

```json
{
    "stable": {
        "userId": "16d9132c-8dc4-49a7-a66d-2a317e884c33",
        "version": "0.0.27"
    },
    "nightly": {
        "userId": "26319089-598d-4267-87d5-cd30160c83d3",
        "version": "0.0.27"
    }
}
```

You can find latest version at [releases page](https://github.com/fastrepl/hyprnote/releases).

Also, download button in [docs](https://docs.hyprnote.com) always points to the latest version.

## Development

### Requirements
``` bash
# Installing the rust toolchain used for tauri and the backend libs
curl https://sh.rustup.rs -sSf | sh
# libomp is required for llama-cpp
brew install libomp
# cmake is required for whisper-rs
brew install cmake
# cidre uses this for audio capture and types
xcode-select --install
# Installing the tools
xcodebuild -runFirstLaunch
# Installing the tools
npm install -g pnpm turbo
```

### Installation
```bash
git clone https://github.com/fastrepl/hyprnote.git
cd hyprnote
pnpm install && turbo -F @hypr/desktop tauri:dev
```

### Potential Errors
#### Architecture/OS Problems
If you run into issues with windows builds or incorrect architectures (i.e. you are on Apple Silicon `arm64` and see something about windows or `x86`), run the build command with your personal architecture specified as an environment variable like:
```bash
CARGO_BUILD_TARGET=aarch64-apple-darwin pnpm exec turbo -F @hypr/desktop tauri:dev 
```

We support:
- MacOS Apple Silicon: `aarch64-apple-darwin`
- MacOS x86 (intel): `x86_64-apple-darwin`
- Windows x86 (intel/amd): `x86_64-pc-windows-msvc`

#### macOS Version Warnings
If you see `XXXX was built for newer 'macOS' version (15.0) than being linked (14.2)` that shouldn't cause major issues because `14.2` is the version of macOS where the `NSAudioCaptureUsageDescription` was added, so newer version of macOS will have it as well. But, if you want to get rid of them, bump the following in your local files from `14.2` to `15.0` and they should go away. Please don't merge this into the repository -- we'd like to keep our app as accessible as possible!
- `crates/tcc/build.rs` - `swift_rs::SwiftLinker::new("14.2")` -> `swift_rs::SwiftLinker::new("15.0")`
- `apps/desktop/src-tauri/tauri.conf.json` - `"minimumSystemVersion": "14.2"` -> `"minimumSystemVersion": "15.0"`
- `crates/tcc/swift-lib/Package.swift` - `platforms: [.macOS("14.2")]` -> `platforms: [.macOS("15.0")]`

## Formatting

We use [dprint](https://dprint.dev/) to format the code.

```bash
dprint fmt
```