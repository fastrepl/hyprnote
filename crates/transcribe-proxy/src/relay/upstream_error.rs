//! Upstream provider error detection and handling

pub use owhisper_client::ProviderError as UpstreamError;

/// Detects if the given data contains an error message from any upstream provider
///
/// # Arguments
///
/// * `data` - Raw bytes from upstream provider, typically JSON
///
/// # Returns
///
/// `Some(UpstreamError)` if an error is detected, `None` otherwise
pub fn detect_upstream_error(data: &[u8]) -> Option<UpstreamError> {
    owhisper_client::Provider::detect_any_error(data)
}
