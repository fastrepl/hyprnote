# Desktop E2E Tests

End-to-end tests for the Hyprnote desktop application using WebDriver and WebDriverIO.

## CI Integration

These tests run automatically in the `desktop_cd` workflow after the release build on Linux, before publishing. The tests gate the release process - if they fail, the build artifacts will not be published.

The workflow automatically:
- Installs `tauri-driver`
- Sets the correct binary path based on the release channel (staging/nightly/stable)
- Runs the E2E tests
- Fails the build if tests don't pass

## Running Tests Locally

### Prerequisites

1. Install `tauri-driver`:
   ```bash
   cargo install tauri-driver
   ```

2. Build the desktop application in release mode:
   ```bash
   pnpm -F desktop tauri build
   ```

### Running Tests

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

### Testing Different Channels

To test a specific channel build, set the `E2E_APP_PATH` environment variable:

```bash
# For staging build
E2E_APP_PATH=apps/desktop/src-tauri/target/release/hyprnote-staging pnpm -F desktop-e2e test

# For nightly build
E2E_APP_PATH=apps/desktop/src-tauri/target/release/hyprnote-nightly pnpm -F desktop-e2e test

# For stable build
E2E_APP_PATH=apps/desktop/src-tauri/target/release/hyprnote pnpm -F desktop-e2e test
```

## Test Structure

- `test/app.spec.js` - Basic smoke tests that verify the app launches and has a window
- `wdio.conf.js` - WebDriverIO configuration with environment variable support

## Notes

- Tests require a release build of the application
- The application path defaults to `../desktop/src-tauri/target/release/hyprnote-dev` for local development
- In CI, the path is set via `E2E_APP_PATH` environment variable based on the release channel
- Tests use the Mocha framework with WebDriverIO's spec reporter
- `tauri-driver` must be installed separately via cargo
