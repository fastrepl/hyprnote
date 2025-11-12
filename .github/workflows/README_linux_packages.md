# Linux Package Workflows

This document describes the automated Linux packaging workflows for Hyprnote.

## Workflows

### `linux_packages.yaml`

Builds and publishes Linux packages (.deb and .AppImage) for Hyprnote desktop application.

#### Trigger Conditions

- **Manual dispatch**: Via GitHub Actions UI (workflow_dispatch)
  - Choose channel: `stable` or `nightly` (default)
- **Automatic**: On release publish (when tag starts with `desktop_`)

#### Jobs

##### 1. `build-linux-packages` - Debian Package

**Runner**: `ubuntu-24.04`

**Builds**: `.deb` package for Debian/Ubuntu-based distributions

**Features**:
- Target: `x86_64-unknown-linux-gnu` (amd64)
- ML Backend: OpenBLAS (STT) + Vulkan (LLM)
- Version validation against release tag
- Full dependency installation (WebKit, GTK, PulseAudio, ALSA, etc.)
- **Installation testing**: Installs the .deb package and verifies:
  - Package installation succeeds
  - Binary is present and executable
  - Shared library dependencies are satisfied
  - .desktop file exists and is valid
- Uploads artifact to GitHub Actions
- Publishes to GitHub Releases (on release events)

**Package naming**: `hyprnote-{VERSION}-amd64.deb`

##### 2. `build-appimage` - AppImage Package

**Runner**: `ubuntu-20.04` (older for better compatibility)

**Builds**: `.AppImage` portable package

**Features**:
- Target: `x86_64-unknown-linux-gnu`
- ML Backend: OpenBLAS (STT) + Vulkan (LLM)
- Self-contained portable format (no installation required)
- **AppImage testing**: Validates the package by:
  - Verifying file format
  - Extracting and inspecting contents
  - Checking for .desktop file and icons
  - Validating binary and dependencies
  - Testing execution (basic smoke test)
- Uploads artifact to GitHub Actions
- Publishes to GitHub Releases (on release events)

**Package naming**: `hyprnote-{VERSION}-x86_64.AppImage`

##### 3. `build-flatpak` - Flathub Publishing (DISABLED)

**Status**: Commented out - awaiting Flathub permissions

**When to enable**:
1. Create Flatpak manifest at `https://github.com/flathub/com.hyprnote.Hyprnote`
2. Get approval from Flathub reviewers
3. Set up `FLATHUB_TOKEN` secret in GitHub
4. Uncomment the job in the workflow

**Required files** (to be created when enabling):
- `com.hyprnote.Hyprnote.yml` - Flatpak manifest
- `com.hyprnote.Hyprnote.metainfo.xml` - AppStream metadata

## Configuration

### Environment Variables

- `RELEASE_CHANNEL`: `stable` or `nightly`
- `TAURI_CONF_PATH`: Points to appropriate Tauri config file
  - Stable: `./src-tauri/tauri.conf.stable.json`
  - Nightly: `./src-tauri/tauri.conf.nightly.json`

### Required Secrets

The workflow uses these GitHub secrets:

- `GITHUB_TOKEN` (automatic)
- `POSTHOG_API_KEY` - Analytics
- `SENTRY_DSN` - Error tracking
- `KEYGEN_ACCOUNT_ID` - License management
- `KEYGEN_VERIFY_KEY` - License verification
- `TAURI_SIGNING_PRIVATE_KEY` - Code signing
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - Key password
- `FLATHUB_TOKEN` (future) - Flathub publishing

## Usage

### Manual Release

1. Go to **Actions** → **Linux Packages** in GitHub
2. Click **Run workflow**
3. Select branch (e.g., `linux-development`)
4. Choose channel: `stable` or `nightly`
5. Click **Run workflow**

### Automatic Release

1. Create a git tag: `desktop_v{VERSION}`
2. Push the tag: `git push origin desktop_v{VERSION}`
3. Create a GitHub release from the tag
4. Workflow triggers automatically
5. Packages are uploaded to the release

## Testing

### Installation Testing

Both workflows include comprehensive testing:

#### .deb Package Testing
- Installs via `dpkg -i`
- Fixes dependencies with `apt-get install -f`
- Verifies package is listed
- Checks binary existence and executability
- Validates shared library dependencies (`ldd`)
- Verifies .desktop file
- Cleans up after testing

#### AppImage Testing
- Validates file format
- Extracts contents (`--appimage-extract`)
- Inspects directory structure
- Verifies .desktop file and icons
- Checks binary and dependencies
- Attempts execution (smoke test)

### Manual Testing

After download, test the packages:

```bash
# .deb package
sudo dpkg -i hyprnote-*.deb
sudo apt-get install -f  # Fix dependencies if needed
hyprnote  # Or launch from application menu

# AppImage
chmod +x hyprnote-*.AppImage
./hyprnote-*.AppImage
```

## Distribution Support

### .deb Package
- ✅ Ubuntu 24.04+
- ✅ Debian 12+ (Bookworm)
- ✅ Linux Mint 21+
- ✅ Pop!_OS 22.04+
- ✅ Elementary OS 7+

### AppImage
- ✅ Universal (works on most distributions)
- ✅ No installation required
- ✅ Compatible with older systems (built on Ubuntu 20.04)
- ✅ Portable (can run from USB drive)

## Architecture Support

Current: `x86_64` (amd64) only

**Future expansion** (add to matrix):
```yaml
- target: "aarch64-unknown-linux-gnu"
  arch: "arm64"
  features: "stt-openblas,llm-vulkan"
```

## Dependencies

### Build Dependencies
- Rust toolchain
- Node.js + pnpm
- Python + Poetry
- protoc (Protocol Buffers)
- System libraries (WebKit, GTK, ALSA, PulseAudio, etc.)

### Runtime Dependencies (included in packages)
- WebKit2GTK 4.1
- GTK 3
- AppIndicator
- ALSA + PulseAudio (audio)
- Vulkan (GPU acceleration)
- OpenBLAS (ML inference)

## Troubleshooting

### Build Failures

**Issue**: Missing system dependencies
**Solution**: Check the "Install system dependencies" step in the workflow

**Issue**: Rust compilation errors
**Solution**: Verify feature flags match your target platform

**Issue**: Version mismatch
**Solution**: Ensure git tag matches version in `tauri.conf.json`

### Installation Issues

**Issue**: .deb dependency errors
**Solution**: Run `sudo apt-get install -f` to resolve

**Issue**: AppImage won't execute
**Solution**: Ensure it's marked executable: `chmod +x *.AppImage`

**Issue**: Missing graphics drivers
**Solution**: Install Vulkan drivers for your GPU

## Future Work

- [ ] Enable Flathub publishing
- [ ] Add ARM64 (aarch64) builds
- [ ] Add RPM packages for Fedora/RHEL
- [ ] Add Arch Linux PKGBUILD
- [ ] Automated testing in containers (different distros)
- [ ] Performance benchmarking in CI
