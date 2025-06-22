# Task Completion Checklist

When you complete any coding task in the Hyprnote project, you MUST run these commands in order:

## 1. Format Code
```bash
# Format Rust code
cargo fmt --all

# Format TypeScript/JavaScript/JSON/Markdown
dprint fmt
```

## 2. Check Code Quality
```bash
# Run Rust lints
cargo clippy --tests

# Check TypeScript types across all packages
turbo typecheck
```

## 3. Update TypeScript Bindings (if applicable)
If you modified any Rust plugin commands or interfaces:
```bash
cargo test export_types
```

## 4. Run Tests
```bash
# Run Rust tests
cargo test

# Run TypeScript tests (if test files exist in the affected packages)
turbo test
```

## 5. Verify Build
For significant changes, verify the project still builds:
```bash
# Check Rust compilation
cargo check --tests

# For frontend changes, verify dev server starts
turbo -F @hypr/desktop tauri:dev
```

## Important Notes
- NEVER skip the formatting step - the project enforces consistent formatting
- If `cargo clippy` reports warnings, fix them before considering the task complete
- If `turbo typecheck` fails, fix all TypeScript errors
- Always run `cargo test export_types` after modifying Rust plugin interfaces
- The project uses `dprint` for TypeScript/JS formatting, NOT prettier
- All commands should pass without errors before marking a task as complete