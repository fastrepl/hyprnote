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
                model: Some("nvidia_parakeet-v2_476MB".to_string()),
                model_repo: Some("argmaxinc/parakeetkit-pro".to_string()),
                model_folder: None,
                custom_vocabulary: Some(vec![]),
            })
            .await
            .unwrap();
        assert!(true);
    }
}
