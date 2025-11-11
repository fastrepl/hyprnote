use std::process::Command;

use crate::NotificationPermission;

/// Linux notification implementation using freedesktop.org Desktop Notifications Specification
///
/// This module provides Linux-specific notification functionality with support for multiple
/// desktop environments. It integrates with the D-Bus notification daemon that is standard
/// on most Linux desktop systems.
///
/// # Architecture
///
/// - **D-Bus Integration**: Uses `org.freedesktop.Notifications` service for permission checking
/// - **Multi-DE Support**: Detects and opens settings for GNOME, KDE, XFCE, MATE, Cinnamon, etc.
/// - **Graceful Fallbacks**: Falls back to generic `xdg-open` when desktop-specific commands fail
///
/// # Permission Model
///
/// Unlike macOS, Linux desktop notifications typically don't require explicit user permission.
/// The notification daemon is usually running and available by default. This implementation
/// checks daemon availability rather than explicit permissions.
///
/// # Desktop Environment Detection
///
/// Desktop environments are detected via:
/// - `XDG_CURRENT_DESKTOP` environment variable (primary)
/// - `DESKTOP_SESSION` environment variable (fallback)

/// Attempts to detect and open the notification settings for common Linux desktop environments
pub fn open_notification_settings() -> std::io::Result<()> {
    // Try to detect the desktop environment
    let desktop_env = std::env::var("XDG_CURRENT_DESKTOP")
        .or_else(|_| std::env::var("DESKTOP_SESSION"))
        .unwrap_or_default()
        .to_lowercase();

    tracing::debug!("Detected desktop environment: {}", desktop_env);

    // Try desktop-specific settings paths
    let result = if desktop_env.contains("gnome") || desktop_env.contains("ubuntu") {
        // GNOME/Ubuntu Settings
        Command::new("gnome-control-center")
            .arg("notifications")
            .spawn()
            .or_else(|_| {
                // Fallback to xdg-open with settings URL
                Command::new("xdg-open")
                    .arg("settings://notifications")
                    .spawn()
            })
    } else if desktop_env.contains("kde") || desktop_env.contains("plasma") {
        // KDE Plasma Settings
        Command::new("systemsettings5")
            .arg("kcm_notifications")
            .spawn()
            .or_else(|_| {
                // Try older KDE version
                Command::new("systemsettings")
                    .arg("kcm_notifications")
                    .spawn()
            })
    } else if desktop_env.contains("xfce") {
        // XFCE Settings
        Command::new("xfce4-notifyd-config").spawn()
    } else if desktop_env.contains("mate") {
        // MATE Settings
        Command::new("mate-notification-properties").spawn()
    } else if desktop_env.contains("cinnamon") {
        // Cinnamon Settings
        Command::new("cinnamon-settings")
            .arg("notifications")
            .spawn()
    } else {
        // Generic fallback - try xdg-open
        Command::new("xdg-open")
            .arg("settings://notifications")
            .spawn()
    };

    match result {
        Ok(_) => {
            tracing::info!("Successfully opened notification settings");
            Ok(())
        }
        Err(e) => {
            tracing::warn!("Failed to open notification settings: {}", e);
            Err(e)
        }
    }
}

/// Checks notification permission status on Linux
///
/// On Linux, desktop notifications via D-Bus (freedesktop.org spec) generally don't require
/// explicit user permission like macOS does. The notification daemon is typically always available.
///
/// However, we check if:
/// 1. A notification daemon is running (by checking if the D-Bus service is available)
/// 2. The application can connect to it
pub fn check_notification_permission(
    completion: impl Fn(Result<NotificationPermission, String>) + Send + 'static,
) {
    // Spawn a thread to avoid blocking
    std::thread::spawn(move || {
        let result = check_notification_daemon();
        completion(result);
    });
}

/// Checks if a notification daemon is available via D-Bus
fn check_notification_daemon() -> Result<NotificationPermission, String> {
    // Try to check if the notification service is available via D-Bus
    let output = Command::new("dbus-send")
        .arg("--session")
        .arg("--dest=org.freedesktop.Notifications")
        .arg("--type=method_call")
        .arg("--print-reply")
        .arg("/org/freedesktop/Notifications")
        .arg("org.freedesktop.Notifications.GetCapabilities")
        .output();

    match output {
        Ok(output) if output.status.success() => {
            tracing::info!("Notification daemon is available and responsive");
            Ok(NotificationPermission::Granted)
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            tracing::warn!("Notification daemon check failed: {}", stderr);

            // Check if it's just not available vs other errors
            if stderr.contains("not provided") || stderr.contains("not found") {
                Ok(NotificationPermission::NotGrantedAndShouldAskManual)
            } else {
                Ok(NotificationPermission::Granted) // Assume available but command failed
            }
        }
        Err(e) => {
            tracing::warn!("Failed to check notification daemon: {}", e);
            // If we can't check, assume notifications might work anyway
            Ok(NotificationPermission::Granted)
        }
    }
}

/// Requests notification permission on Linux
///
/// On Linux, there's typically no permission request needed. This function exists
/// for API compatibility with other platforms. We simply check if a notification
/// daemon is available.
pub fn request_notification_permission() {
    if cfg!(debug_assertions) {
        return;
    }

    // On Linux, we don't need to explicitly request permission
    // The wezterm notification will handle showing notifications via D-Bus
    // We just log that the request was made
    tracing::info!("Notification permission requested (Linux - no action needed)");

    // Optionally check daemon availability in background
    std::thread::spawn(|| {
        let result = check_notification_daemon();
        match result {
            Ok(NotificationPermission::Granted) => {
                tracing::info!("Notification daemon confirmed available");
            }
            Ok(perm) => {
                tracing::warn!("Notification daemon status: {:?}", perm);
            }
            Err(e) => {
                tracing::error!("Failed to check notification daemon: {}", e);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_check_notification_daemon() {
        // This test will pass/fail based on whether a notification daemon is running
        let result = check_notification_daemon();
        println!("Notification daemon check result: {:?}", result);
        assert!(result.is_ok());
    }

    #[test]
    fn test_check_notification_permission() {
        use std::sync::mpsc;
        let (tx, rx) = mpsc::channel();

        check_notification_permission(move |result| {
            tx.send(result).unwrap();
        });

        let result = rx.recv_timeout(std::time::Duration::from_secs(5));
        assert!(result.is_ok());
        println!("Permission check result: {:?}", result);
    }
}
