//! Authentication state management.

use hypr_supabase_auth::SupabaseAuth;

/// State container for authentication middleware.
///
/// This type holds the Supabase authentication client and the required
/// entitlement that authenticated users must possess.
#[derive(Clone)]
pub struct AuthState {
    pub(crate) inner: SupabaseAuth,
    pub(crate) required_entitlement: String,
}

impl AuthState {
    /// Creates a new authentication state.
    ///
    /// # Arguments
    ///
    /// * `supabase_url` - The Supabase project URL
    /// * `required_entitlement` - The entitlement that users must have to access protected routes
    ///
    /// # Example
    ///
    /// ```no_run
    /// use api_auth::AuthState;
    ///
    /// let state = AuthState::new(
    ///     "https://example.supabase.co",
    ///     "hyprnote_pro"
    /// );
    /// ```
    pub fn new(supabase_url: &str, required_entitlement: impl Into<String>) -> Self {
        Self {
            inner: SupabaseAuth::new(supabase_url),
            required_entitlement: required_entitlement.into(),
        }
    }

    /// Returns a reference to the required entitlement.
    pub fn required_entitlement(&self) -> &str {
        &self.required_entitlement
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_state_creation() {
        let state = AuthState::new("https://example.supabase.co", "hyprnote_pro");
        assert_eq!(state.required_entitlement(), "hyprnote_pro");
    }

    #[test]
    fn test_auth_state_clone() {
        let state = AuthState::new("https://example.supabase.co", "hyprnote_pro");
        let cloned = state.clone();
        assert_eq!(cloned.required_entitlement(), "hyprnote_pro");
    }
}
