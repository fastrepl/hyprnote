# notification-linux

Custom notification implementation for Linux using GTK4.

This crate provides a custom notification system for Linux with similar look-and-feel to the macOS implementation, offering more control than native system notifications.

## System Requirements

This crate requires GTK4 development libraries to be installed:

### Ubuntu/Debian
```bash
sudo apt-get install libgtk-4-dev
```

### Fedora
```bash
sudo dnf install gtk4-devel
```

### Arch Linux
```bash
sudo pacman -S gtk4
```

## Features

- Custom notification windows with GTK4
- Support for title, message, and action buttons
- Automatic positioning and stacking of multiple notifications
- Configurable timeout with auto-dismiss
- Click handlers for confirm and dismiss actions
- URL opening support

## Usage

```rust
use notification_linux::*;

let notification = Notification::builder()
    .title("Meeting Started")
    .message("Your meeting has begun")
    .url("https://example.com/meeting")
    .timeout(std::time::Duration::from_secs(5))
    .build();

show(&notification);
```

## Architecture

The implementation uses GTK4 to create custom notification windows that appear in the top-right corner of the screen, similar to the macOS implementation. The notifications support:

- Custom styling with CSS
- Hover effects and close buttons
- Action buttons for URLs
- Automatic repositioning when notifications are added/removed
- Callback handlers for user interactions
