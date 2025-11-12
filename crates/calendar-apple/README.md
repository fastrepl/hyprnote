# Apple Calendar Integration

This crate provides Apple Calendar integration for Hyprnote with platform-specific implementations:

- **macOS**: Uses native EventKit framework for direct calendar access
- **Linux/Other**: Uses CalDAV protocol to sync with iCloud calendars

## Platform-Specific Implementation

The crate automatically selects the appropriate implementation based on the target OS:

```rust
#[cfg(target_os = "macos")]
// Uses EventKit (native macOS framework)

#[cfg(not(target_os = "macos"))]
// Uses CalDAV protocol
```

## macOS Setup

On macOS, the app will request calendar access permissions through the system dialog. No additional configuration is needed.

## Linux/CalDAV Setup

On Linux and other non-macOS platforms, the integration uses CalDAV to sync with iCloud calendars.

### Prerequisites

1. **iCloud Account**: You need an Apple ID with iCloud enabled
2. **App-Specific Password**: Generate an app-specific password from appleid.apple.com

### Generating an App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Navigate to **Security** → **App-Specific Passwords**
4. Click **Generate Password**
5. Enter a label (e.g., "Hyprnote CalDAV")
6. Save the generated password (you won't be able to see it again)

### Configuration

Set the following environment variables before running Hyprnote:

```bash
export CALDAV_URL="https://caldav.icloud.com"
export CALDAV_USERNAME="your-apple-id@icloud.com"
export CALDAV_PASSWORD="your-app-specific-password"
```

**Security Note**: The app-specific password is NOT your regular Apple ID password. Never use your main Apple ID password for CalDAV access.

### Testing CalDAV Connection

You can verify your CalDAV connection with curl:

```bash
curl -u "your-apple-id@icloud.com:app-specific-password" \
  -X PROPFIND \
  -H "Depth: 1" \
  -H "Content-Type: application/xml" \
  --data '<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname />
  </d:prop>
</d:propfind>' \
  https://caldav.icloud.com/
```

## Usage

The `Handle` type provides a unified interface regardless of platform:

```rust
use hypr_calendar_apple::Handle;
use hypr_calendar_interface::CalendarSource;

// Create a handle (automatically selects macOS or CalDAV)
let handle = Handle::new();

// Check access status
if handle.calendar_access_status() {
    // List calendars
    let calendars = handle.list_calendars().await?;
    
    // List events
    let events = handle.list_events(filter).await?;
}
```

## Architecture

### macOS Implementation (`macos_native.rs`)
- Uses `objc2-event-kit` bindings to EventKit framework
- Direct access to system calendars
- Requires user permission through system dialog
- Supports both calendars and contacts

### CalDAV Implementation (`caldav.rs`)
- HTTP-based CalDAV protocol (RFC 4791)
- Uses `reqwest` for HTTP client
- Parses iCalendar format with `ical` crate
- XML parsing with `roxmltree`
- Currently calendar-only (contacts via CardDAV coming soon)

## Future Improvements

- [ ] CardDAV support for contacts sync on Linux
- [ ] Credential storage in application database
- [ ] UI for CalDAV configuration
- [ ] Support for other CalDAV servers (Nextcloud, etc.)
- [ ] OAuth2 authentication support
- [ ] Bidirectional sync (create/update/delete events)

## Dependencies

### Common
- `hypr-calendar-interface` - Shared trait definitions
- `chrono` - Date/time handling
- `itertools` - Iterator utilities

### macOS-specific
- `objc2` - Objective-C bindings
- `objc2-event-kit` - EventKit framework
- `objc2-contacts` - Contacts framework
- `block2` - Closure support for callbacks

### Linux/CalDAV-specific
- `reqwest` - HTTP client with TLS
- `ical` - iCalendar format parsing
- `roxmltree` - XML parsing
- `base64` - HTTP Basic Auth encoding

## Contributing

When adding features, ensure they work on both platforms:
- Test macOS with native EventKit
- Test Linux with iCloud CalDAV
- Consider other CalDAV servers (Nextcloud, etc.)
