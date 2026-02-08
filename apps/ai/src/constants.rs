//! Application-wide constants.

/// HTTP header name for device fingerprint used in analytics and user tracking.
pub const DEVICE_FINGERPRINT_HEADER: &str = "x-device-fingerprint";

/// Required entitlement tier for accessing protected routes.
pub const REQUIRED_ENTITLEMENT: &str = "hyprnote_pro";

/// Default port for the HTTP server.
pub const DEFAULT_PORT: u16 = 3001;

/// Sentry service tag value.
pub const SERVICE_NAME: &str = "hyprnote-ai";
