# Comprehensive Linux Build Guide for Hyprnote Desktop

This guide provides step-by-step instructions for compiling the Hyprnote desktop application on Linux. It has been tested and verified on Ubuntu 22.04 and Ubuntu 24.04.

## Overview

Hyprnote is a local-first, AI-powered meeting notes application built with Tauri (Rust + React). The desktop application requires both Node.js/pnpm for the frontend and Rust for the backend, along with various system libraries for Tauri and audio processing.

## System Requirements

### Supported Linux Distributions

This guide has been tested on:
- Ubuntu 22.04 LTS
- Ubuntu 24.04 LTS

Other Debian-based distributions should work with similar steps, though package names may vary slightly.

### Hardware Requirements

- **CPU**: x86_64 processor (Intel/AMD 64-bit)
- **RAM**: Minimum 8GB recommended (build process is memory-intensive)
- **Disk Space**: At least 10GB free space for dependencies and build artifacts
- **Internet**: Required for downloading dependencies

## Prerequisites

### 1. System Dependencies

Install all required system libraries and development tools:

```bash
# Update package lists
sudo apt update

# Install Tauri dependencies
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Install additional dependencies for Hyprnote
sudo apt-get install -y \
  libgtk-3-dev \
  libgtk-4-dev \
  libasound2-dev \
  libpulse-dev \
  libgraphene-1.0-dev \
  pkg-config \
  patchelf \
  cmake

# Install cross-compilation tools (optional, for building ARM64 targets)
sudo apt-get install -y \
  gcc-aarch64-linux-gnu
```

**What these packages do:**
- `libwebkit2gtk-4.1-dev`: WebKit rendering engine for Tauri
- `build-essential`: GCC, g++, make, and other build tools
- `libssl-dev`: OpenSSL development libraries
- `libayatana-appindicator3-dev`: System tray support
- `librsvg2-dev`: SVG rendering support
- `libgtk-3-dev`, `libgtk-4-dev`: GTK GUI toolkit
- `libasound2-dev`, `libpulse-dev`: Audio system libraries (ALSA and PulseAudio)
- `pkg-config`: Helper tool for compiling applications
- `patchelf`: Tool for modifying ELF binaries (required for AppImage bundling)
- `cmake`: Build system generator (required for some Rust dependencies)

### 2. Node.js and pnpm

Hyprnote requires Node.js 22 and pnpm 10.21.0.

```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node --version  # Should show v22.x.x

# Install pnpm 10.21.0 globally
sudo npm install -g pnpm@10.21.0

# Verify pnpm installation
pnpm --version  # Should show 10.21.0
```

### 3. Rust Toolchain

Hyprnote requires Rust 1.91.1 with specific targets.

```bash
# Install Rust 1.91.1
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.91.1

# Add Rust to your PATH (or restart your shell)
source $HOME/.cargo/env

# Verify Rust installation
rustc --version  # Should show rustc 1.91.1

# Add required Linux targets
rustup target add x86_64-unknown-linux-gnu x86_64-unknown-linux-musl aarch64-unknown-linux-gnu
```

## Building Hyprnote

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/fastrepl/hyprnote.git
cd hyprnote
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies (this may take several minutes)
pnpm install --frozen-lockfile
```

This will install dependencies for all packages in the monorepo, including:
- Desktop app frontend dependencies
- Shared UI components
- Tauri plugins
- Development tools

### 3. Build UI Package

The desktop app depends on the shared UI package, which must be built first:

```bash
pnpm -F ui build
```

### 4. Build Desktop Application

#### Development Build

For development and testing:

```bash
pnpm -F desktop tauri dev
```

This will:
- Compile the Rust backend
- Start the Vite development server
- Launch the application in development mode with hot-reload

#### Production Build

For a production-ready AppImage:

```bash
pnpm -F desktop tauri build --bundles appimage --target x86_64-unknown-linux-gnu
```

Build options:
- `--bundles appimage`: Creates an AppImage bundle (portable Linux application)
- `--target x86_64-unknown-linux-gnu`: Specifies the target architecture

The build process will:
1. Compile TypeScript frontend code
2. Compile Rust backend code
3. Bundle everything into an AppImage

**Build time:** The first build can take 10-30 minutes depending on your system. Subsequent builds will be faster due to caching.

**Output location:**
```
apps/desktop/src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/
```

The AppImage file will be named something like `hyprnote_<version>_amd64.AppImage`.

### 5. Running the AppImage

```bash
# Make the AppImage executable
chmod +x apps/desktop/src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/*.AppImage

# Run the application
./apps/desktop/src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/*.AppImage
```

## Using Docker for Building

A Dockerfile is provided for reproducible builds in a clean environment.

### Build the Docker Image

```bash
docker build -t hyprnote-linux-dev -f Dockerfile.linux-dev .
```

### Build Inside Docker

```bash
# Development build
docker run --rm -v $(pwd):/workspace hyprnote-linux-dev pnpm -F desktop tauri dev

# Production build
docker run --rm -v $(pwd):/workspace hyprnote-linux-dev \
  pnpm -F desktop tauri build --bundles appimage --target x86_64-unknown-linux-gnu
```

The Docker approach ensures:
- Consistent build environment across different systems
- All dependencies are correctly installed
- No conflicts with existing system packages

## Verification and Testing

### Type Checking

```bash
pnpm -F desktop typecheck
```

### Running Tests

```bash
# JavaScript/TypeScript tests
pnpm -F desktop test

# Rust tests
cargo test -p desktop
```

### Code Formatting

```bash
# Check formatting (required before creating PRs)
dprint check

# Auto-format code
dprint fmt
```

### Linting

```bash
# Rust linting
cargo check -p desktop

# Full workspace check
cargo check
```

## Troubleshooting

### Common Issues

#### 1. Missing System Libraries

**Error:** `Package webkit2gtk-4.1 was not found`

**Solution:** Install the missing webkit2gtk package:
```bash
sudo apt-get install libwebkit2gtk-4.1-dev
```

#### 2. Node.js Version Mismatch

**Error:** `The engine "node" is incompatible with this module`

**Solution:** Ensure you're using Node.js 22:
```bash
node --version  # Should be v22.x.x
```

If not, reinstall Node.js 22 following the prerequisites section.

#### 3. Rust Version Mismatch

**Error:** `package requires rustc 1.91.1 or newer`

**Solution:** Update Rust to the correct version:
```bash
rustup install 1.91.1
rustup default 1.91.1
```

#### 4. Out of Memory During Build

**Error:** Build process killed or crashes

**Solution:** 
- Close other applications to free up RAM
- Add swap space if needed
- Use a machine with more RAM (minimum 8GB recommended)

#### 5. Audio Library Issues

**Error:** `Could not find libasound2` or similar audio-related errors

**Solution:** Install audio development libraries:
```bash
sudo apt-get install -y libasound2-dev libpulse-dev
```

#### 6. pnpm Installation Fails

**Error:** `ENOENT: no such file or directory` during `pnpm install`

**Solution:**
- Ensure you're in the repository root directory
- Try clearing pnpm cache: `pnpm store prune`
- Delete `node_modules` and `pnpm-lock.yaml`, then run `pnpm install` again

### Getting Help

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/fastrepl/hyprnote/issues) for similar problems
2. Review the CI configuration in `.github/workflows/desktop_cd.yaml` for the exact build steps used in production
3. Try building with Docker to isolate environment-specific issues
4. Create a new issue with:
   - Your Linux distribution and version
   - Complete error messages
   - Steps to reproduce the issue

## Build Configuration

### Environment Variables

The build process uses several environment variables for configuration. For local development builds, these are typically not required. For production builds, you may need:

- `VITE_SUPABASE_URL`: Supabase backend URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_APP_URL`: Application URL
- `VITE_API_URL`: API backend URL

These can be set in `apps/desktop/.env` file (see `apps/desktop/.env.example` for reference).

### Build Channels

Hyprnote supports multiple build channels:

- **Stable**: Production releases (`tauri.conf.stable.json`)
- **Nightly**: Daily builds with latest features (`tauri.conf.nightly.json`)
- **Staging**: Internal testing (`tauri.conf.staging.json`)

To build for a specific channel:
```bash
pnpm -F desktop tauri build --config src-tauri/tauri.conf.stable.json
```

### Bundle Types

Tauri supports multiple bundle types on Linux:

- `appimage`: Portable AppImage (recommended)
- `deb`: Debian package
- `rpm`: RPM package

To build multiple bundle types:
```bash
pnpm -F desktop tauri build --bundles appimage,deb --target x86_64-unknown-linux-gnu
```

## Performance Tips

### Faster Builds

1. **Use `cargo` build cache**: Subsequent builds will be much faster
2. **Parallel compilation**: Rust uses all CPU cores by default
3. **Incremental builds**: Development builds (`tauri dev`) use incremental compilation
4. **Link-time optimization**: Production builds use LTO for smaller binaries (but slower builds)

### Disk Space Management

Build artifacts can consume significant disk space:

```bash
# Clean Rust build artifacts
cargo clean

# Clean Node.js dependencies
pnpm clean

# Clean specific package
pnpm -F desktop clean
```

## Architecture Notes

### Monorepo Structure

Hyprnote uses a Cargo + pnpm monorepo:

- `apps/desktop/`: Main desktop application
- `crates/`: Rust libraries (audio, database, AI, etc.)
- `plugins/`: Tauri plugins (Rust + TypeScript)
- `packages/`: Shared TypeScript packages
- `owhisper/`: Custom Whisper implementation

### Key Technologies

- **Frontend**: React 19, TypeScript, Vite, TanStack Router
- **Backend**: Rust, Tauri 2.9, Tokio async runtime
- **Audio**: ALSA/PulseAudio via cpal, custom audio processing
- **Database**: libsql (SQLite fork)
- **AI**: Local LLM via llama.cpp, Whisper for transcription

## CI/CD Reference

The official CI/CD pipeline configuration can be found in:
- `.github/workflows/desktop_ci.yaml`: Continuous integration tests
- `.github/workflows/desktop_cd.yaml`: Release builds

These workflows are the authoritative source for build configuration and can be referenced if you encounter issues with local builds.

## Contributing

When contributing code changes:

1. Format code with `dprint fmt`
2. Run type checks: `pnpm -F desktop typecheck`
3. Run tests: `pnpm -F desktop test` and `cargo test -p desktop`
4. Ensure `cargo check -p desktop` passes
5. Follow the existing code style and conventions

## License

See the LICENSE file in the repository root.

## Additional Resources

- [Tauri Documentation](https://tauri.app/)
- [Rust Documentation](https://doc.rust-lang.org/)
- [pnpm Documentation](https://pnpm.io/)
- [Hyprnote Website](https://hyprnote.com/)
