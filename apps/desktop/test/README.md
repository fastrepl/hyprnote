# Desktop E2E Tests

Simple WebDriver tests for the Hyprnote desktop application.

## Prerequisites

Install tauri-driver:

```bash
cargo install tauri-driver
```

Build the application in release mode:

```bash
pnpm -F desktop tauri build
```

## Running Tests

Start tauri-driver in one terminal:

```bash
tauri-driver
```

Run the tests in another terminal:

```bash
pnpm -F desktop test:e2e
```

## Test Structure

- `test/specs/` - Test files
- `wdio.conf.js` - WebDriverIO configuration
