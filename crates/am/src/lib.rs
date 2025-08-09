mod client;
mod error;
mod types;

pub use client::*;
pub use error::*;
pub use types::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let _client = AmClient::default();
        assert!(true);
    }
}
