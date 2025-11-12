# Linux Package Workflows

This document describes the automated Linux packaging workflows for Hyprnote.

## Workflows Overview

Hyprnote provides automated packaging for multiple Linux distributions:

- **`linux_packages.yaml`**: .deb (Debian/Ubuntu) and .AppImage (universal)
- **`linux_packages_rpm.yaml`**: .rpm (Fedora/RHEL/openSUSE)
- **`linux_packages_arch.yaml`**: .pkg.tar.zst (Arch Linux)

All workflows support both **x86_64** and **aarch64** (ARM64) architectures.

## Workflow Details

### `linux_packages.yaml` - Debian & AppImage

Builds and publishes .deb packages and AppImage for Debian-based distributions.

#### Trigger Conditions

- **Manual dispatch**: Via GitHub Actions UI (workflow_dispatch)
  - Choose channel: `stable` or `nightly` (default)
- **Automatic**: On release publish (when tag starts with `desktop_`)

#### Jobs

##### 1. `build-linux-packages` - Debian Package

**Runner**: `ubuntu-24.04`

**Builds**: `.deb` package for Debian/Ubuntu-based distributions

**Architectures**:
- `x86_64-unknown-linux-gnu` (amd64)
- `aarch64-unknown-linux-gnu` (arm64) - with cross-compilation

**Features**:
- ML Backend: OpenBLAS (STT) + Vulkan (LLM)
- Version validation against release tag
- Full dependency installation (WebKit, GTK, PulseAudio, ALSA, etc.)
- ARM64 cross-compilation using gcc-aarch64-linux-gnu
- **Installation testing** (x86_64 only): Installs the .deb package and verifies:
  - Package installation succeeds
  - Binary is present and executable
  - Shared library dependencies are satisfied
  - .desktop file exists and is valid
- **Package verification** (ARM64): Validates package structure and binary architecture
- Uploads artifact to GitHub Actions
- Publishes to GitHub Releases (on release events)

**Package naming**: `hyprnote-{VERSION}-{amd64|arm64}.deb`

##### 2. `build-appimage` - AppImage Package

**Runner**: `ubuntu-20.04` (older for better compatibility)

**Builds**: `.AppImage` portable package

**Architectures**:
- `x86_64-unknown-linux-gnu`
- `aarch64-unknown-linux-gnu` (ARM64) - with cross-compilation

**Features**:
- ML Backend: OpenBLAS (STT) + Vulkan (LLM)
- Self-contained portable format (no installation required)
- ARM64 cross-compilation support
- **AppImage testing** (x86_64 only): Validates the package by:
  - Verifying file format
  - Extracting and inspecting contents
  - Checking for .desktop file and icons
  - Validating binary and dependencies
  - Testing execution (basic smoke test)
- **Package verification** (ARM64): Validates file format and binary architecture
- Uploads artifact to GitHub Actions
- Publishes to GitHub Releases (on release events)

**Package naming**: `hyprnote-{VERSION}-{x86_64|aarch64}.AppImage`

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

---

### `linux_packages_rpm.yaml` - RPM Packages

Builds and publishes .rpm packages for Fedora, RHEL, and openSUSE-based distributions.

#### Trigger Conditions

- **Manual dispatch**: Via GitHub Actions UI (workflow_dispatch)
- **Automatic**: On release publish (when tag starts with `desktop_`)

#### Job: `build-rpm`

**Container**: `fedora:40`

**Builds**: `.rpm` package

**Architectures**:
- `x86_64-unknown-linux-gnu`
- `aarch64-unknown-linux-gnu` (ARM64) - with cross-compilation

**Features**:
- ML Backend: OpenBLAS (STT) + Vulkan (LLM)
- Native Fedora build environment
- ARM64 cross-compilation using gcc-aarch64-linux-gnu
- **Installation testing** (x86_64 only): Installs via dnf and verifies binary, dependencies, and .desktop file
- **Package verification** (ARM64): Uses rpm2cpio to extract and validate binary architecture
- Uploads artifact to GitHub Actions
- Publishes to GitHub Releases (on release events)

**Package naming**: `hyprnote-{VERSION}-{x86_64|aarch64}.rpm`

---

### `linux_packages_arch.yaml` - Arch Linux Packages

Builds and publishes Arch Linux packages using PKGBUILD.

#### Trigger Conditions

- **Manual dispatch**: Via GitHub Actions UI (workflow_dispatch)
- **Automatic**: On release publish (when tag starts with `desktop_`)

#### Job: `build-arch-package`

**Container**: `archlinux:latest`

**Builds**: `.pkg.tar.zst` package

**Architectures**:
- `x86_64-unknown-linux-gnu`
- `aarch64-unknown-linux-gnu` (ARM64) - with cross-compilation

**Features**:
- ML Backend: OpenBLAS (STT) + Vulkan (LLM)
- Native Arch Linux build environment
- PKGBUILD generated dynamically during build
- Built using makepkg (non-root builder user)
- ARM64 cross-compilation support
- **Installation testing** (x86_64 only): Installs via pacman and verifies binary
- **Package verification** (ARM64): Extracts tarball and validates binary architecture
- Uploads artifact to GitHub Actions
- Publishes to GitHub Releases (on release events)

**Package naming**: `hyprnote-{VERSION}-{x86_64|aarch64}.pkg.tar.zst`

---

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

**For .deb and AppImage:**
1. Go to **Actions** → **Linux Packages** in GitHub
2. Click **Run workflow**
3. Select branch (e.g., `linux-development`)
4. Choose channel: `stable` or `nightly`
5. Click **Run workflow**

**For RPM packages:**
1. Go to **Actions** → **Linux RPM Packages** in GitHub
2. Follow steps 2-5 above

**For Arch packages:**
1. Go to **Actions** → **Arch Linux Packages** in GitHub
2. Follow steps 2-5 above

### Automatic Release

1. Create a git tag: `desktop_v{VERSION}`
2. Push the tag: `git push origin desktop_v{VERSION}`
3. Create a GitHub release from the tag
4. All workflows trigger automatically
5. Packages are uploaded to the release

**Expected artifacts per release:**
- `hyprnote-{VERSION}-amd64.deb`
- `hyprnote-{VERSION}-arm64.deb`
- `hyprnote-{VERSION}-x86_64.AppImage`
- `hyprnote-{VERSION}-aarch64.AppImage`
- `hyprnote-{VERSION}-x86_64.rpm`
- `hyprnote-{VERSION}-aarch64.rpm`
- `hyprnote-{VERSION}-x86_64.pkg.tar.zst`
- `hyprnote-{VERSION}-aarch64.pkg.tar.zst`

**Total: 8 packages per release**

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
# .deb package (Debian/Ubuntu)
sudo dpkg -i hyprnote-*-amd64.deb  # or arm64.deb
sudo apt-get install -f  # Fix dependencies if needed
hyprnote  # Or launch from application menu

# .rpm package (Fedora/RHEL)
sudo dnf install hyprnote-*-x86_64.rpm  # or aarch64.rpm
# Or on RHEL/CentOS:
sudo yum install hyprnote-*-x86_64.rpm
hyprnote

# Arch package
sudo pacman -U hyprnote-*-x86_64.pkg.tar.zst  # or aarch64.pkg.tar.zst
hyprnote

# AppImage (universal)
chmod +x hyprnote-*-x86_64.AppImage  # or aarch64.AppImage
./hyprnote-*.AppImage
```

## Distribution Support

### .deb Package
- ✅ Ubuntu 24.04+ (amd64, arm64)
- ✅ Debian 12+ Bookworm (amd64, arm64)
- ✅ Linux Mint 21+ (amd64, arm64)
- ✅ Pop!_OS 22.04+ (amd64, arm64)
- ✅ Elementary OS 7+ (amd64, arm64)
- ✅ Raspberry Pi OS 64-bit (arm64)

### .rpm Package
- ✅ Fedora 40+ (x86_64, aarch64)
- ✅ RHEL 9+ (x86_64, aarch64)
- ✅ Rocky Linux 9+ (x86_64, aarch64)
- ✅ AlmaLinux 9+ (x86_64, aarch64)
- ✅ openSUSE Tumbleweed (x86_64, aarch64)

### Arch Linux Package
- ✅ Arch Linux (x86_64, aarch64)
- ✅ Manjaro (x86_64, aarch64)
- ✅ EndeavourOS (x86_64, aarch64)
- ✅ Garuda Linux (x86_64, aarch64)

### AppImage
- ✅ Universal (works on most distributions)
- ✅ No installation required
- ✅ Compatible with older systems (built on Ubuntu 20.04)
- ✅ Portable (can run from USB drive)
- ✅ x86_64 and aarch64 (ARM64) support

## Architecture Support

**Current**: ✅ `x86_64` (amd64) and `aarch64` (arm64)

All workflows now support both architectures:
- Native builds for x86_64
- Cross-compilation for ARM64 using gcc-aarch64-linux-gnu
- Installation testing on x86_64 runners
- Package verification for ARM64 (without requiring native execution)

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

**Issue**: ARM64 cross-compilation fails
**Solution**: 
- Check that gcc-aarch64-linux-gnu is installed
- Verify PKG_CONFIG environment variables are set
- Ensure ARM64 libraries are available

### Installation Issues

**Issue**: .deb dependency errors
**Solution**: Run `sudo apt-get install -f` to resolve

**Issue**: .rpm dependency errors
**Solution**: Run `sudo dnf install --best --allowerasing` or check for conflicting packages

**Issue**: Arch package conflicts
**Solution**: Check for file conflicts with `pacman -Qo <file>` and resolve manually

**Issue**: AppImage won't execute
**Solution**: 
- Ensure it's marked executable: `chmod +x *.AppImage`
- Check if FUSE is installed (some systems need it)

**Issue**: Missing graphics drivers
**Solution**: Install Vulkan drivers for your GPU

**Issue**: ARM64 package won't run on x86_64
**Solution**: ARM64 packages are architecture-specific and require ARM64 hardware (Raspberry Pi, ARM servers, etc.)

## Future Work

- [x] ~~Enable ARM64 (aarch64) builds~~ ✅ **COMPLETED**
- [x] ~~Add RPM packages for Fedora/RHEL~~ ✅ **COMPLETED**
- [x] ~~Add Arch Linux PKGBUILD~~ ✅ **COMPLETED**
- [ ] Enable Flathub publishing
- [ ] Automated testing in containers (different distros)
- [ ] Performance benchmarking in CI
- [ ] Add RISC-V support (when Tauri supports it)
- [ ] Publish to distribution repositories (PPAs, AUR, COPR)
