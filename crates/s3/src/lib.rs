use std::ops::Deref;

pub struct Client {
    s3: aws_sdk_s3::Client,
}

pub struct UserClient<'a> {
    client: &'a Client,
    user_id: String,
}

pub struct Config {}

impl Client {
    pub async fn new(_config: Config) -> Self {
        let endpoint_url = "https://fly.storage.tigris.dev";
        let access_key_id = "TODO";
        let secret_access_key = "TODO";

        let creds =
            aws_credential_types::Credentials::from_keys(access_key_id, secret_access_key, None);

        let cfg = aws_config::from_env()
            .endpoint_url(endpoint_url)
            // https://www.tigrisdata.com/docs/concepts/regions/
            .region(aws_config::Region::new("auto"))
            .credentials_provider(creds)
            .load()
            .await;

        let s3 = aws_sdk_s3::Client::new(&cfg);

        Self { s3 }
    }

    pub fn for_user<'a>(&'a self, user_id: impl Into<String>) -> UserClient<'a> {
        UserClient {
            client: self,
            user_id: user_id.into(),
        }
    }
}

impl<'a> Deref for UserClient<'a> {
    type Target = aws_sdk_s3::Client;

    fn deref(&self) -> &Self::Target {
        &self.client.s3
    }
}

impl<'a> UserClient<'a> {
    pub async fn get(&self) {
        let _ = self
            .get_object()
            .bucket(self.user_id.to_string())
            .key("test")
            .send()
            .await;
    }

    pub async fn put(&self) {}

    pub async fn delete(&self) {}

    pub async fn delete_all(&self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_client() {
        let client = Client::new(Config {}).await;
        client.for_user("123").get().await;
    }
}
