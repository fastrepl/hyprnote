# Rust Style Guide Compliance

The Hyprnote project strictly follows the [official Rust Style Guide](https://doc.rust-lang.org/stable/style-guide/) as enforced by `rustfmt`.

## Quick Reference

### Formatting
- **Indentation**: 4 spaces (no tabs)
- **Max line width**: 100 characters
- **Trailing commas**: Required in multi-line constructs
- **Blank lines**: One between top-level items

### Naming Conventions
- **Types/Traits**: `UpperCamelCase` (e.g., `AudioProcessor`)
- **Functions/Methods**: `snake_case` (e.g., `process_audio`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `MAX_BUFFER_SIZE`)
- **Variables**: `snake_case` (e.g., `audio_buffer`)

### Import Order
1. `std` library imports
2. External crate imports
3. Internal crate imports (`crate::`)
4. Module imports (`super::`, `self::`)

### Key Patterns
- Prefer expression-oriented code
- Use `Result<T, E>` for fallible operations
- Document public APIs with `///`
- Use `#[cfg(test)]` for unit tests
- Platform-specific code behind feature flags

### Always Run
```bash
cargo fmt --all        # Format code
cargo clippy --tests   # Check lints
```