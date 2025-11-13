# AGENTS.md

This file gives automated agents concise guidance for working in this repository.

## Overview
This is a polyglot monorepo:
- Rust crates under `crates/` and `plugins/` plus some standalone dirs.
- Tauri / desktop and web apps under `apps/`.
- Shared TypeScript packages under `packages/`.
- Scripts (Python, shell, Swift) under `scripts/`.

## Build
- Rust: `cargo build` for whole workspace; `cargo build -p <crate>` for a single crate.
- Use feature flags to avoid heavy ML deps: e.g. `cargo test -p tauri-plugin-listener --no-default-features --features export-types` for specta export without local LLM/STT.
- Prefer optional dependencies + a dedicated feature (e.g. `connector`) instead of unconditional linking.
- Node/TS: `pnpm install`, then `pnpm run build` (Turbo orchestrates). For a single package: `pnpm --filter <name> run build`.

## Testing
- Rust: `cargo test` (workspace). Single crate: `cargo test -p <crate>`. With feature gating: `cargo test -p <crate> --no-default-features --features <feat>`.
- Run a single Rust test: `cargo test -p <crate> <test_name>`.
- TypeScript/Vitest: `pnpm --filter <pkg> test`. Single test name: `pnpm --filter <pkg> vitest run path/to/file.test.ts -t "test name"`.
- Run snapshot tests: `cargo install cargo-insta` then `cargo test`.

## Formatting & Lint
- Rust formatting via `dprint fmt` (uses exec rustfmt). Run before committing.
- Keep Rust imports grouped: std, external crates, workspace crates, local modules.
- TypeScript formatting also via `dprint fmt`. Do not introduce other formatters unless necessary.
- Avoid trailing whitespace; keep line length reasonable (<120 typical).

## i18n / Translations
- Uses Lingui for internationalization. After modifying UI text, run: `task i18n` (or `pnpm -F desktop lingui:extract`).
- **CRITICAL**: Always run `pnpm -F desktop lingui:compile` after extract and before building to sync translation keys.
- Build order for desktop: `poetry run python scripts/pre_build.py` → `pnpm -F desktop lingui:compile` → `pnpm -F ui build` → `pnpm -F desktop tauri build`.
- Translation catalogs: `apps/desktop/src/locales/{en,ko}/messages.{po,ts}`. The `.ts` files are compiled from `.po`.

## Conventions (Rust)
- Modules & functions: `snake_case`; types & enums: `CamelCase`.
- Errors: use `thiserror`; prefer a central `Error` enum and `Result<T, crate::Error>`.
- Instrument async/public functions with `#[tracing::instrument(skip(...))]` when adding tracing.
- Feature gating: wrap variants/APIs with `#[cfg(feature = "feat")]`; supply fallbacks when disabled.

## Adding Features
- Introduce new optional deps with a matching feature name; add to `default` only if broadly needed.
- For specta/TS type export steps, minimize dependency surface (avoid heavy ML crates) by disabling default features.
- Extend builders (e.g. event/command registration) conditionally behind feature flags.

## TypeScript/Apps
- Prefer explicit types for public APIs. Use consistent naming: `camelCase` for variables/functions, `PascalCase` for types/components.
- Centralized config and shared utilities live in `packages/utils` and `packages/ui`.
- Desktop app: `pnpm -F desktop tauri:dev` for development. Uses Vite + React + Tauri v2.

## Scripts
- Python uses `poetry.lock` / `pyproject.toml`; prefer `poetry run python <script>` if dependencies matter.
- Shell scripts in `scripts/` should be idempotent; do not add interactive prompts.

## Performance / Heavy Deps
- Whisper / Llama and STT/LLM crates are large; gate them and avoid including them in lightweight export/test commands.

## Pull Requests
- Keep diffs minimal and focused; explain "why" in commit/PR body.
- Ensure `dprint fmt` and targeted tests pass before requesting review.

## Code Review
- Use `coderabbit --prompt-only` for AI-powered code analysis; let it run fully to completion.
- **Always run `coderabbit --prompt-only` at the end of every task** to ensure code quality.

## Do Not
- Do not commit large model binaries.
- Do not add new formatters or global toolchains without discussion.
- Do not enable heavy features for simple type export or CI smoke tests.
