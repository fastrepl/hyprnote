## Project Overview

Hyprnote is an AI-powered meeting notepad that runs offline and locally. It's a Tauri-based desktop application with a complex audio processing pipeline and plugin architecture.

## Essential Commands

### Typescript/React Development
```bash
# Install dependencies (use pnpm)
pnpm install

# Run desktop app in development
turbo -F @hypr/desktop tauri:dev

# Build desktop app for production
turbo -F @hypr/desktop tauri:build

# Run type checking across all packages
turbo typecheck

# Format code (uses dprint)
dprint fmt

# Clean build artifacts
turbo clean
```

### Rust Development
```bash
# Check compilation
cargo check --tests

# Check lints with Clippy
cargo clippy --tests

# Format Rust code
cargo fmt --all

# Generate TypeScript bindings from Rust plugins
cargo test export_types

# Run Rust tests
cargo test

# Clean build artifacts
cargo clean
```

## Architecture Overview

### Monorepo Structure
- **apps/desktop**: Main Tauri desktop application
- **apps/app**: Web application version (shares code with desktop)
- **crates/**: Rust libraries for core functionality (audio, STT, LLM, etc.)
- **plugins/**: Tauri plugins with TypeScript bindings
- **packages/**: Shared TypeScript packages (utils, UI components, stores)

### Key Architectural Patterns

1. **Plugin System**: Each feature is implemented as a Tauri plugin with:
    - Rust implementation in `plugins/[name]/src/`
    - Auto-generated TypeScript bindings in `plugins/[name]/guest-js/`
    - Commands and events exposed via Tauri's IPC bridge

2. **Audio Processing Pipeline**:
    - Real-time audio capture → VAD → Echo cancellation → Chunking → STT
    - Multiple STT backends: Whisper (local), Deepgram (cloud), Clova
    - Audio state managed in `crates/audio/`

3. **State Management**:
    - Client state: Zustand stores in `packages/stores/`
    - Server state: React Query with generated OpenAPI client
    - Session management: Custom SessionStore handles recording state

4. **Native Platform Integration**:
    - macOS: NSPanel, Apple Calendar integration, custom Swift code
    - Windows: Registry entries for protocol handling
    - Platform-specific code in `apps/desktop/src-swift/` and build scripts

## Development Workflow

### Adding New Features
1. If it needs native access, create a new plugin in `plugins/`
2. Implement Rust logic and expose commands
3. Run `cargo test export_types` to generate TypeScript bindings
4. Import and use in React components

### Working with Audio
- Audio processing logic is in `crates/audio/`
- STT implementations are in `crates/stt-*`
- Audio chunking strategies are in `crates/audio-chunking/`
- Voice Activity Detection uses Silero VAD model

### Database Schema
- Local SQLite database managed by Turso/libsql
- Migrations in `apps/app/server/db/migrations/`
- Schema defined using Drizzle ORM

### Testing
- TypeScript: Vitest for unit tests
- Rust: Standard `cargo test`
- E2E: WebdriverIO setup in `apps/desktop/tests/`

## Rust Codebase Architecture

### Crate Organization
The `crates/` directory contains 47 specialized crates organized by functionality:

#### Audio Processing Pipeline
- **audio**: Platform-specific audio I/O (macOS CoreAudio, Windows WASAPI, Linux ALSA)
- **chunker**: VAD-based intelligent audio chunking
- **vad**: Voice Activity Detection using Silero ONNX models
- **aec/aec2**: Acoustic Echo Cancellation implementations
- **denoise**: DTLN-based audio denoising

#### AI/ML Infrastructure
- **whisper**: Local Whisper with Metal/CUDA acceleration
- **llama**: Local LLaMA integration
- **onnx**: ONNX runtime wrapper for neural network inference
- **gbnf**: Grammar-based structured LLM output
- **template**: Jinja-based prompt templating

#### Speech Processing
- **stt**: Unified STT interface supporting multiple backends
- **deepgram/clova/rtzr**: Cloud STT integrations
- **pyannote**: Speaker diarization (cloud + local ONNX)

#### Database Layer
- **db-core**: libSQL/Turso abstraction
- **db-admin/db-user**: Domain-specific database operations
- Migration system with dual-mode tracking

### Key Rust Patterns

1. **Error Handling**: Consistent use of `thiserror` for error types
2. **Async Architecture**: Tokio-based with futures streams
3. **Builder Pattern**: For complex configurations (DatabaseBuilder)
4. **Zero-Copy Audio**: Direct memory access in audio pipeline
5. **Platform Abstractions**: Clean interfaces with platform-specific implementations

### Performance Considerations

- Stream-based processing for real-time audio
- ONNX GraphOptimizationLevel::Level3 for inference
- Platform-specific SIMD optimizations
- Chunk-based processing for long audio sessions

## Code Conventions

### TypeScript/React
- Functional components with TypeScript strict mode
- Custom hooks prefix: `use` (e.g., `useSession`)
- Zustand stores for global state
- TanStack Query for server state
- File naming: kebab-case for files, PascalCase for components

### Rust
- Module organization with clear public interfaces
- Error types using `thiserror`
- Async-first with Tokio runtime
- Platform-specific code behind feature flags
- Consistent use of `tracing` for logging

### Testing Strategy
- Unit tests alongside code (`#[cfg(test)]` modules)
- Integration tests in `tests/` directories
- Export type tests ensure TypeScript binding generation

## Important Considerations

1. **Platform-Specific Builds**:
    - Always specify architecture for Apple Silicon builds
    - Different macOS minimum versions affect available features
    - Platform features: `[target.'cfg(target_os = "macos")'.dependencies]`

2. **Code Generation**:
    - TypeScript types from Rust: Run after modifying plugin commands
    - OpenAPI client: Generated from backend API
    - Routes: TanStack Router with file-based routing

3. **Performance**:
    - Audio processing is performance-critical
    - Use native Rust implementations for heavy computation
    - React components should be optimized for real-time updates
    - Stream processing for real-time audio handling

4. **Security**:
    - Plugin permission system enforces access control
    - Local-first design means sensitive data stays on device
    - Cloud features require explicit user opt-in
    - Platform security integration (macOS accessibility, etc.)

5. **Dependencies**:
    - Requires libomp for Llama on macOS
    - cmake needed for Whisper compilation
    - Xcode Command Line Tools on macOS
    - ONNX runtime for neural network models