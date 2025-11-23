# Desktop E2E Tests

End-to-end tests for the Hyprnote desktop application using WebDriver and WebDriverIO.

## Prerequisites

1. Install `tauri-driver`:
   ```bash
   cargo install tauri-driver
   ```

2. Build the desktop application in release mode:
   ```bash
   pnpm -F desktop tauri build
   ```

## Running Tests

1. Install dependencies (if not already installed):
   ```bash
   pnpm install
   ```

2. Run the tests:
   ```bash
   pnpm -F desktop-e2e test
   ```

The test runner will automatically:
- Start `tauri-driver` in the background
- Launch the application
- Run the test suite
- Clean up and shut down `tauri-driver`

## Test Structure

- `test/app.spec.js` - Basic smoke tests that verify the app launches and has a window
- `wdio.conf.js` - WebDriverIO configuration

## Notes

- Tests require a release build of the application
- The application path is configured in `wdio.conf.js` and points to `../desktop/src-tauri/target/release/hyprnote`
- Tests use the Mocha framework with WebDriverIO's spec reporter
- `tauri-driver` must be installed separately via cargo
