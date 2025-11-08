mod client;
mod error;
mod model;
mod types;

pub use client::*;
pub use error::*;
pub use model::*;
pub use types::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_client_creation() {
        let client = Client::new("http://localhost:50060/v1");
        let status = client.status().await;
        println!("{:?}", status);
        client
            .init(InitRequest {
                api_key: "".to_string(),
                model: None,
                model_repo: None,
                model_folder: None,
            })
            .await
            .unwrap();
        assert!(true);
    }
}
