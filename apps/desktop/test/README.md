# WebDriver Tests

Simple desktop tests using WebDriverIO and tauri-driver.

## Prerequisites

- tauri-driver: `cargo install tauri-driver`
- WebKitWebDriver must be available in PATH (Linux requirement)

## Running Tests

1. Build the release version:
```bash
pnpm tauri:build
```

2. Start tauri-driver in a separate terminal:
```bash
tauri-driver --port 4445
```

3. Run the tests:
```bash
pnpm test:webdriver
```

## Notes

- The tests require a release build of the application
- WebKitWebDriver availability depends on the system's WebKit/GTK installation
- On systems without WebKitWebDriver, you may need to install webkit2gtk packages
