use std::ops::Deref;

use aws_sdk_s3::error::SdkError;
use aws_sdk_s3::operation::create_bucket::CreateBucketError;
use aws_sdk_s3::operation::delete_object::DeleteObjectError;
use aws_sdk_s3::operation::get_object::GetObjectError;
use aws_sdk_s3::operation::put_object::PutObjectError;
use aws_sdk_s3::primitives::{AggregatedBytes, ByteStreamError};

#[derive(Clone)]
pub struct Client {
    s3: aws_sdk_s3::Client,
    bucket: String,
}

pub struct UserClient<'a> {
    client: &'a Client,
    user_id: String,
}

pub struct Config {
    pub endpoint_url: String,
    pub bucket: String,
    pub access_key_id: String,
    pub secret_access_key: String,
}

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Error while deleting object: {0}")]
    DeleteObjectError(#[from] SdkError<DeleteObjectError>),
    #[error("Error while getting object: {0}")]
    GetObjectError(#[from] SdkError<GetObjectError>),
    #[error("Error while putting object: {0}")]
    PutObjectError(#[from] SdkError<PutObjectError>),
    #[error("Error while creating bucket: {0}")]
    CreateBucketError(#[from] SdkError<CreateBucketError>),
    #[error("Error while collecting bytes: {0}")]
    CollectBytesError(#[from] ByteStreamError),
}

impl Client {
    pub async fn new(config: Config) -> Self {
        let creds = aws_credential_types::Credentials::from_keys(
            config.access_key_id,
            config.secret_access_key,
            None,
        );

        let cfg = aws_config::from_env()
            .endpoint_url(config.endpoint_url)
            // https://www.tigrisdata.com/docs/concepts/regions/
            .region(aws_config::Region::new("auto"))
            .credentials_provider(creds)
            .load()
            .await;

        let s3 = aws_sdk_s3::Client::new(&cfg);

        Self {
            s3,
            bucket: config.bucket,
        }
    }

    pub fn for_user<'a>(&'a self, user_id: impl Into<String>) -> UserClient<'a> {
        UserClient {
            client: self,
            user_id: user_id.into(),
        }
    }

    pub async fn get_bucket(&self) -> bool {
        self.s3
            .head_bucket()
            .bucket(&self.bucket)
            .send()
            .await
            .is_ok()
    }

    pub async fn create_bucket(&self) -> Result<(), ApiError> {
        let _ = self.s3.create_bucket().bucket(&self.bucket).send().await?;
        Ok(())
    }
}

impl<'a> Deref for UserClient<'a> {
    type Target = Client;

    fn deref(&self) -> &Self::Target {
        &self.client
    }
}

impl<'a> UserClient<'a> {
    fn folder(&self) -> String {
        format!("user_{}", self.user_id)
    }

    pub async fn get(&self, file_name: &str) -> Result<AggregatedBytes, ApiError> {
        let res = self
            .s3
            .get_object()
            .bucket(&self.bucket)
            .key(format!("{}/{}", self.folder(), file_name))
            .send()
            .await?;

        let data = res.body.collect().await?;
        Ok(data)
    }

    pub async fn put(
        &self,
        file_name: &str,
        content: impl Into<aws_sdk_s3::primitives::ByteStream>,
    ) -> Result<(), ApiError> {
        let _ = self
            .s3
            .put_object()
            .bucket(&self.bucket)
            .key(format!("{}/{}", self.folder(), file_name))
            .body(content.into())
            .content_type("audio/mpeg")
            .send()
            .await?;

        Ok(())
    }

    pub async fn delete(&self, file_name: &str) -> Result<(), ApiError> {
        let _ = self
            .s3
            .delete_object()
            .bucket(&self.bucket)
            .key(format!("{}/{}", self.folder(), file_name))
            .send()
            .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[ignore]
    #[tokio::test]
    async fn test_client() {
        let endpoint_url = "http://127.0.0.1:9000";
        let access_key_id = "minio-user";
        let secret_access_key = "minio-password";

        let client = Client::new(Config {
            endpoint_url: endpoint_url.to_string(),
            bucket: "hyprnote".to_string(),
            access_key_id: access_key_id.to_string(),
            secret_access_key: secret_access_key.to_string(),
        })
        .await;

        if !client.get_bucket().await {
            client.create_bucket().await.unwrap();
        }

        let user_client = client.for_user("123");

        user_client
            .put("test.mp3", "test".as_bytes().to_vec())
            .await
            .unwrap();

        let res = user_client.get("test.mp3").await.unwrap();
        let data = res.into_bytes();
        assert_eq!(data, "test".as_bytes());
    }
}
