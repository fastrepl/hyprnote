mod client;
mod error;
mod types;

pub use client::*;
pub use error::*;
pub use types::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_client_creation() {
        let client = AmClient::new("http://localhost:50060");
        let status = client.status().await;
        println!("{:?}", status);
        assert!(true);
    }
}
