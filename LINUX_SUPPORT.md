# Linux Support Status

This document outlines the current status of Linux support in the Hyprnote application, highlighting areas that are missing or incomplete.

## Recent Improvements (November 2025)

### Audio System Robustness
While speaker audio capture remains unimplemented, the underlying audio system has been significantly strengthened:

*   **Error Handling:** Eliminated 100+ potential panic points by replacing `unwrap()`/`expect()` calls with proper `Result` types throughout the audio crates
*   **Device Management:** Improved microphone device enumeration and validation with graceful fallbacks
*   **Thread Safety:** Added proper mutex poison error handling across the audio subsystem
*   **Code Quality:** Extracted helper functions and eliminated code duplication in audio configuration

### Detection System Improvements  
The application and browser detection systems have been made more robust for Linux:

*   **Graceful Command Execution:** Browser detection in `crates/detect/src/browser/linux.rs` now handles system command failures gracefully instead of causing crashes
*   **Safe Regex Compilation:** Added proper error handling for regex compilation in detection modules
*   **Improved Error Reporting:** Enhanced error messages and logging for debugging detection issues

These improvements provide a more stable foundation for Linux support while the core missing features are being addressed.

## 1. Speaker Audio Capture

**This is the most critical missing feature for full Linux support.**

The current implementation for speaker audio capture on Linux is a mock that only generates silence. The file `crates/audio/src/speaker/linux.rs` needs to be implemented to capture system audio using a native Linux audio backend.

**Recommended solutions:**

*   **PipeWire:** The modern and preferred audio server on Linux.
*   **PulseAudio:** A widely used and still relevant audio server.
*   **ALSA:** The underlying audio API, which can be used for broader compatibility.

## 2. Notifications

The `hypr_notification2` crate, which is responsible for handling desktop notifications, has incomplete support for Linux.

*   **Basic Notifications:** Basic notifications may work if the underlying `wezterm` crate has Linux support.
*   **Missing Features:**
    *   **Permission Handling:** The ability to request notification permissions from the user is not implemented for Linux.
    *   **Settings Integration:** The functionality to open the system's notification settings is not implemented for Linux.

## 3. Desktop Integration

### 3.1. Application Menu

The main application menu is customized for macOS to provide a more native look and feel. This includes adding "About Hyprnote" and "New Note" items to the application menu. This level of integration is missing for Linux.

### 3.2. Window Decorations

The `plugins/windows` crate contains platform-specific code for window decorations on macOS and Windows.

*   **macOS:** Uses a title bar with an overlay style and a hidden title.
*   **Windows:** Uses borderless windows.
*   **Linux:** Lacks specific window decoration configurations, which may result in an inconsistent and less polished user experience. The application will use the default window decorations provided by the user's window manager.

## 4. Build and Packaging

While not explicitly investigated, it's important to ensure that the application can be easily built and packaged for various Linux distributions. This includes:

*   **Dependencies:** Ensuring that all required dependencies are available on common Linux distributions.
*   **Packaging Formats:** Providing packages in common formats like `.deb` (for Debian/Ubuntu), `.rpm` (for Fedora/CentOS), and `AppImage` (for distribution-agnostic use).

## 5. macOS-Specific Features and Implementations

Several features and implementations in the Hyprnote application are specific to macOS. These features will not work on Linux, and in some cases, the application may not behave as expected.

### 5.1. Apple Calendar Integration

The `tauri-plugin-apple-calendar` is **macOS-specific** and cannot be used on Linux. This is because it relies on macOS-specific technologies to interact with the Calendar and Contacts applications.

The reasons for this include:

*   **`osascript`:** The plugin uses `osascript` to execute AppleScript for interacting with the Calendar application.
*   **`open x-apple.systempreferences`:** The plugin uses macOS-specific URL schemes to open the System Preferences to the correct privacy settings.
*   **`hypr_calendar_apple` crate:** The plugin uses the `hypr_calendar_apple` crate, which is a wrapper around Apple's native frameworks for accessing calendar and contact data.
*   **`tccutil`:** The plugin uses the `tccutil` command-line tool to manage calendar and contacts permissions, which is specific to macOS.

### 5.2. AI/ML Acceleration

The application uses Apple's **Metal** and **Core ML** frameworks for hardware-accelerated AI/ML tasks on macOS. This is enabled through the `llm-metal`, `stt-metal`, and `stt-coreml` features. While the application may fall back to CPU-based processing on Linux, it will not have the same level of performance as on Apple hardware.

### 5.3. Autostart

The autostart feature is implemented using `launchd` on macOS. For the application to autostart on Linux, a different implementation is required, such as creating a `.desktop` file in the `~/.config/autostart/` directory.

### 5.4. Microphone and System Audio Permissions

The permission handling for microphone and system audio access is heavily reliant on macOS-specific APIs and command-line tools.

*   **`check_microphone_access`:** On Linux, this function is a workaround that tries to open the microphone to see if it's available, which is not a reliable permission check.
*   **`request_microphone_access`:** On Linux, this function also tries to open the microphone, which may or may not trigger a system-level permission prompt.
*   **`open_microphone_access_settings` and `open_system_audio_access_settings`:** These functions will not work on Linux as they use macOS-specific URLs.
*   **`check_system_audio_access`:** This function relies on the `hypr_tcc` crate, which is entirely macOS-specific and always returns `true` on Linux.

### 5.5. TCC (Transparency, Consent, and Control)

The `hypr_tcc` crate, which is used for managing permissions, is entirely macOS-specific and has no functionality on Linux.

### 5.6. Email Integration

The application uses the native macOS email client to send emails. This is implemented in the `crates/email` crate, which uses the `NSSharingService` class. This functionality will be missing on Linux. To provide a similar feature on Linux, a different approach would be needed, such as opening a `mailto:` URL or using a library that can communicate with common Linux email clients.

### 5.7. Application and Browser Detection

The application uses platform-specific APIs to detect running applications and the frontmost browser window. This is used for features like automatically detecting meetings.

*   **`crates/detect/src/app/macos.rs`:** Uses `ns::RunningApp` and `ns::Workspace` to detect running applications.
*   **`crates/detect/src/browser/macos.rs`:** Uses `objc2_foundation::NSURL` and `objc2_app_kit::NSWorkspace` to get the URL of the frontmost browser window.

**Linux Implementation Status:** Basic browser detection functionality exists in `crates/detect/src/browser/linux.rs` but with recent improvements for robustness:
*   System command execution now handles failures gracefully instead of causing crashes
*   Improved error handling for process detection and window management commands
*   Safe regex compilation with proper fallback handling

A more complete Linux-specific implementation would benefit from using the `/proc` filesystem or libraries like `libprocps` for enhanced application detection.

## 6. Conclusion

To achieve full Linux support, the following tasks need to be prioritized:

1.  **Implement speaker audio capture** in `crates/audio/src/speaker/linux.rs`.
2.  **Add full notification support** for Linux in the `hypr_notification2` crate, including permission handling and settings integration.
3.  **Improve desktop integration** by customizing the application menu and window decorations for a more native Linux experience.
4.  **Ensure robust build and packaging** for various Linux distributions.
