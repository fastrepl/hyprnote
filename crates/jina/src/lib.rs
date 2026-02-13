mod client;
mod error;
mod reader;

pub use client::*;
pub use error::*;
pub use reader::*;

macro_rules! common_derives {
    ($item:item) => {
        #[derive(
            Debug,
            Eq,
            PartialEq,
            Clone,
            serde::Serialize,
            serde::Deserialize,
            specta::Type,
            schemars::JsonSchema,
        )]
        $item
    };
}

pub(crate) use common_derives;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_read_url() {
        let client = JinaClientBuilder::default()
            .api_key("test-key")
            .build()
            .unwrap();

        let _ = client
            .read_url(ReadUrlRequest {
                url: "https://example.com".to_string(),
            })
            .await;
    }

    #[test]
    fn test_build_missing_api_key() {
        let result = JinaClientBuilder::default().build();
        assert!(result.is_err());
    }
}
